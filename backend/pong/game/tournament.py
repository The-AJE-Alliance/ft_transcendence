import json
import aio_pika
import asyncio
import logging

from PIL.ImagePalette import random
from aio_pika import ExchangeType
from django.conf import settings

logger = logging.getLogger(__name__)


class TournamentManager:
    def __init__(self, tournament_id):
        self.tournament_id = tournament_id
        logger.info(
            f"TournamentManager instantiated with tournament_id: {self.tournament_id}"
        )
        self.players = {}
        self.matches = []  # List of matches in the tournament
        self.current_match_index = -1  # Index of the current match
        self.exchange = None
        self.lock = False
        self.connection = None
        self.channel = None
        self.exchange = None
        self.queue = None
        self.nb_players = 0

    async def start(self):
        self.connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange(
            f"tournament-{self.tournament_id}", ExchangeType.DIRECT, auto_delete=False
        )
        self.queue = await self.channel.declare_queue(
            name=f"tournament-{self.tournament_id}-manager",
            auto_delete=False,
        )
        await self.queue.bind(self.exchange, routing_key="tournament")
        asyncio.create_task(self.consume_data())

    async def consume_data(self):
        try:
            logger.info("TournamentManager is starting to consume data...")
            async with self.queue.iterator() as iterator:
                async for message in iterator:
                    async with message.process():
                        logger.info(
                            f"TournamentManager received message: {message.body.decode()}"
                        )
                        await self.dispatch(message.body.decode())
        except Exception as e:
            logger.error(f"Exception in consume_data: {str(e)}")

    async def dispatch(self, message):
        try:
            data = json.loads(message)
            match data.get("type"):
                case "setup_tournament":
                    await self.setup_tournament(data["content"])
                # case "add_player":
                #     await self.add_player(data["content"]["player"])
                case "remove_player":
                    await self.remove_player(data["content"]["player"])
                case "lock_tournament":
                    await self.lock_tournament()
                case "start_tournament":
                    await self.start_tournament()
                case "end_match":
                    winner = data["content"].get("winner")
                    await self.end_match(winner)
                case _:
                    logger.warning(f"Unhandled message type: {data.get('type')}")
        except Exception as e:
            logger.error(f"Exception in dispatch: {str(e)}")

    async def add_player(self, player_id, content):
        if player_id in self.players:
            return
        self.nb_players += 1
        self.players[player_id] = self.Player(
            content.get("user_id"),
            content.get("tournament_id"),
            content.get("host"),
            player_id,
            content.get("nickname"),
        )
        await self.broadcast(
            {
                "type": "player_joined",
                "content": {
                    "players": [player.to_dict() for player in self.players.values()]
                },
            }
        )

    async def setup_tournament(self, content):
        logger.info("Entering setup_tournament")
        logger.info(
            f"[TournamentManager] setup_tournament called with content: {json.dumps(content, indent=4)}"
        )
        if content.get("host"):
            self.players[0] = self.Player(
                content.get("user_id"),
                content.get("tournament_id"),
                content.get("host"),
                0,
                content.get("nickname"),
            )
        else:
            await self.add_player(content.get("user-id"), content)

        message = {
            "type": "setup_tournament",
            "content": {
                "player_id": self.nb_players,
                "tournament_id": self.tournament_id,
                "players": [player.__dict__ for player in self.players.values()],
            },
        }
        logger.info(f"Broadcasting setup_tournament: {json.dumps(message, indent=4)}")
        await self.broadcast(message)
        logger.info("Exiting setup_tournament")

    async def remove_player(self, player):
        if player in self.players:
            del self.players[player]
            await self.broadcast({"type": "player_left", "content": {"player": player}})

    ### Lock Tournament ###
    async def lock_tournament(self):
        if len(self.players) < 2:
            await self.broadcast(
                {
                    "type": "tournament_locked",
                    "content": {
                        "ready": False,
                        "message": "Not enough players to start the tournament.",
                    },
                }
            )
            return
        self.lock = True
        self.generate_bracket()
        await self.broadcast(
            {
                "type": "tournament_locked",
                "content": {
                    "ready": True,
                    "bracket": self.matches,
                    "message": "Tournament is locked and brackets are generated.",
                },
            }
        )

    def generate_bracket(self):
        players_list = list(self.players.values())
        random.shuffle(players_list)  # Pour mélanger les joueurs
        self.matches = [
            {
                "player1": players_list[i].to_dict(),
                "player2": players_list[i + 1].to_dict(),
                "winner": None,
            }
            for i in range(0, len(players_list) - 1, 2)
        ]

    async def start_round(self):
        for match in self.matches:
            if match["winner"] is None:
                match["room_id"] = (
                    f"match-{match['player1']['user_id']}-vs-{match['player2']['user_id']}"
                )
                await self.broadcast(
                    {"type": "match_ready", "content": {"match": match}}
                )

    async def start_tournament(self):
        if not self.matches:
            return
        await self.broadcast(
            {
                "type": "start_tournament",
                "content": {
                    "message": "Tournament has started!",
                    "bracket": self.matches,
                },
            }
        )
        await self.start_round()

    async def start_next_match(self):
        self.current_match_index += 1
        if self.current_match_index >= len(self.matches):
            await self.end_tournament()
            return

        current_match = self.matches[self.current_match_index]
        await self.broadcast(
            {
                "type": "match_ready",
                "content": {
                    "tournament_id": self.tournament_id,
                    "match": current_match,
                    "room_id": f"room-{self.current_match_index}",
                },
            }
        )

    async def prepare_next_round(self):
        winners = [match["winner"] for match in self.matches]
        if len(winners) <= 1:
            await self.end_tournament(winners[0])
            return
        # Générer les nouveaux matchs pour le prochain round
        self.matches = [
            {"player1": winners[i], "player2": winners[i + 1], "winner": None}
            for i in range(0, len(winners) - 1, 2)
        ]
        await self.broadcast(
            {"type": "tournament_update", "content": {"bracket": self.matches}}
        )
        await self.start_round()

    async def end_match(self, winner, match_id):
        # Trouver le match correspondant
        for match in self.matches:
            if match["room_id"] == match_id:
                match["winner"] = winner
                break
        # Vérifier si tous les matchs du round sont terminés
        if all(m["winner"] is not None for m in self.matches):
            await self.prepare_next_round()

        await self.broadcast(
            {
                "type": "match_ended",
                "content": {
                    "tournament_id": self.tournament_id,
                    "match": current_match,
                },
            }
        )

        await self.start_next_match()

    async def end_tournament(self):
        winners = [match["winner"] for match in self.matches if match["winner"]]
        final_winner = winners[0] if len(winners) == 1 else "TBD"  # Simplified logic
        await self.broadcast(
            {"type": "tournament_end", "content": {"winner": final_winner}}
        )

    async def broadcast(self, message):
        logger.info(
            f"[TournamentManager] Broadcasting message: {json.dumps(message, indent=4)}"
        )
        await self.exchange.publish(
            aio_pika.Message(body=json.dumps(message).encode()), routing_key="players"
        )

    class Player:
        def __init__(self, user_id, tournament_id, host, player_num, nickname):
            self.user_id = user_id
            self.tournament_id = tournament_id
            self.host = host
            self.player_num = player_num
            self.nickname = nickname

        def to_dict(self):
            return {
                "user_id": self.user_id,
                "tournament_id": self.tournament_id,
                "host": self.host,
                "player_num": self.player_num,
                "nickname": self.nickname,
            }
