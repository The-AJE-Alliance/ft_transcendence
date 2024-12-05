import json
import aio_pika
import asyncio
import logging

import random
from aio_pika import ExchangeType
from asgiref.sync import sync_to_async
from django.conf import settings
from .models import PongUser


logger = logging.getLogger(__name__)
game_tasks = {}


class TournamentManager:
    def __init__(self, tournament_id, host_user_id):
        self.tournament_id = tournament_id
        self.host_user_id = host_user_id
        self.started = False
        self.players = {}
        self.matches = []  # List of matches in the tournament
        self.current_match_index = -1  # Index of the current match
        self.exchange = None
        self.lock = False
        self.connection = None
        self.channel = None
        self.queue = None
        self.nb_players = 0
        logger.info(
            f"TournamentManager instantiated with tournament_id: {self.tournament_id}"
        )

    async def start(self):
        try:
            self.connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
            self.channel = await self.connection.channel()
            self.exchange = await self.channel.declare_exchange(
                f"tournament-{self.tournament_id}",
                ExchangeType.DIRECT,
                auto_delete=False,
            )
            self.queue = await self.channel.declare_queue(
                name=f"tournament-{self.tournament_id}-manager",
                auto_delete=False,
            )
            await self.queue.bind(self.exchange, routing_key="tournament")
            asyncio.create_task(self.consume_data())
        except Exception as e:
            logger.error(f"Exception in tournamentManager.start: {e}", exc_info=True)

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
                case "remove_player":
                    await self.remove_player(data["content"]["player"])
                case "lock_tournament":
                    await self.lock_tournament(data["content"])
                case "start_tournament":
                    await self.start_tournament()
                case "end_match":
                    winner_id = data["content"].get("winner_id")
                    match_id = data["content"].get("match_id")
                    await self.end_match(winner_id, match_id)
                case _:
                    logger.warning(f"Unhandled message type: {data.get('type')}")
        except Exception as e:
            logger.error(f"Exception in dispatch: {str(e)}")

    async def add_player(self, user_id, content):
        if user_id in self.players:
            return
        self.nb_players += 1
        self.players[user_id] = await self.Player.create(
            content.get("user_id"),
            content.get("tournament_id"),
            content.get("host"),
            self.nb_players,
        )

    async def setup_tournament(self, content):
        logger.info("Entering setup_tournament")
        logger.info(
            f"[TournamentManager] setup_tournament called with content: {json.dumps(content, indent=4)}"
        )
        user_id = content["user_id"]
        await self.add_player(user_id, content)

        setup_message = {
            "type": "setup_tournament",
            "content": {
                "player_id": self.players[user_id].player_num,
                "tournament_id": self.tournament_id,
                "players": [player.to_dict() for player in self.players.values()],
            },
        }

        add_message = {
            "type": "player_joined",
            "content": {
                "players": [player.to_dict() for player in self.players.values()]
            },
        }
        logger.info(
            f"Sending to setup tournament setup_tournament: {json.dumps(setup_message, indent=4)}"
        )
        await self.send_player(setup_message, user_id)
        await self.broadcast(add_message)

        logger.info("Exiting setup_tournament")

    async def remove_player(self, player_id):
        if player_id in self.players:
            del self.players[player_id]
            await self.broadcast(
                {"type": "player_left", "content": {"player": player_id}}
            )
            for match in self.matches:
                if (
                    match["player1"]["user_id"] == player_id
                    or match["player2"]["user_id"] == player_id
                ):
                    match["winner"] = (
                        match["player2"]
                        if match["player1"]["user_id"] == player_id
                        else match["player1"]
                    )
                    await self.end_match(match["winner"]["user_id"], match["room_id"])

    ### Lock Tournament ###
    async def lock_tournament(self, content):
        user_id = content["user_id"]
        logger.info(
            f"Received lock_tournament from user {user_id} for tournament {self.tournament_id}"
        )
        # Vérifier si le tournoi est déjà verrouillé
        if self.lock:
            logger.warning(f"Tournament {self.tournament_id} is already locked.")
            await self.send_player(
                {
                    "type": "tournament_locked",
                    "content": {
                        "ready": True,
                        "bracket": self.matches,
                        "message": "Tournament is already locked.",
                        "host_user_id": self.host_user_id,
                    },
                },
                user_id,
            )
            return
        # self.host_user_id = user_id
        if not self.host_user_id:
            self.host_user_id = user_id
        player = self.players[user_id]
        if not player or not player.host:
            logger.error(f"User {user_id} is not authorized to lock the tournament.")
            # TODO: is not host
            return
        if len(self.players) < 2:
            await self.send_player(
                {
                    "type": "tournament_locked",
                    "content": {
                        "ready": False,
                        "message": "Not enough players to start the tournament.",
                    },
                },
                user_id,
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
                    "host_user_id": self.host_user_id,
                },
            }
        )
        logger.info(f"Tournament {self.tournament_id} has been successfully locked.")
        # await self.send_player(
        #     {
        #         "type": "tournament_locked",
        #         "content": {
        #             "ready": True,
        #             "bracket": self.matches,
        #             "message": "Tournament is locked and brackets are generated.",
        #         },
        #     },
        #     user_id,
        # )

    def generate_bracket(self):
        players_list = list(self.players.values())
        random.shuffle(players_list)  # Pour mélanger les joueurs
        self.matches = []
        for i in range(0, len(players_list) - 1, 2):
            player1 = players_list[i]
            player2 = players_list[i + 1]
            if not player1 or not player2:
                logger.error("Un des joueurs n'est pas correctement configuré.")
                continue
                # Convertir les objets Player en dictionnaires
            player1_dict = player1.to_dict()
            player2_dict = player2.to_dict()
            # Assigner l'hôte : on définit player1 comme hôte
            player1_dict["host"] = True
            player2_dict["host"] = False
            match = {
                "player1": player1_dict,
                "player2": player2_dict,
                "winner": None,
                "room_id": f"match-{player1.user_id}-vs-{player2.user_id}",
            }
            self.matches.append(match)
        if not self.matches:
            logger.error("Aucun match n'a été généré. Vérifiez les joueurs.")

    async def start_round(self):
        for match in self.matches:
            if not match["player1"] or not match["player2"]:
                logger.error(f"Match invalide: {match}")
                continue
            if match["winner"] is None:
                match["room_id"] = (
                    f"match-{match['player1']['user_id']}-vs-{match['player2']['user_id']}"
                )
                await self.broadcast(
                    {
                        "type": "match_ready",
                        "content": {
                            "tournament_id": self.tournament_id,
                            "match": match,
                        },
                    }
                )
        logger.info(f"Round commencé avec {len(self.matches)} matchs.")

    async def start_tournament(self):
        if self.started:
            logger.warning("Tournament has already started.")
            return
        self.started = True
        if not self.matches:
            logger.error("Aucun match à démarrer.")
            return
        logger.info(
            f"Tournament {self.tournament_id} démarré avec {len(self.matches)} matchs."
        )
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
        winners = [match["winner"] for match in self.matches if match["winner"]]
        if len(winners) == 1:
            await self.end_tournament(winners[0])
            return
        # Générer le match final
        if len(winners) == 2:
            player1 = {**winners[0], "host": True}
            player2 = {**winners[1], "host": False}
            final_match = {
                "player1": player1,
                "player2": player2,
                "winner": None,
                "room_id": f"match-{player1['user_id']}-vs-{player2['user_id']}",
            }
            self.matches = [final_match]
            await self.broadcast(
                {"type": "tournament_update", "content": {"bracket": self.matches}}
            )
            await self.start_round()
        else:
            logger.error("Unexpected number of winners. Tournament cannot proceed.")

    async def send_match_result(self, match):
        player1_id = match["player1"]["user_id"]
        player2_id = match["player2"]["user_id"]
        winner_id = match["winner"]["user_id"]

        # Envoyer le résultat au joueur 1
        await self.send_player(
            {
                "type": "match_result",
                "content": {
                    "result": "win" if winner_id == player1_id else "lose",
                    "opponent": match["player2"]["nickname"],
                },
            },
            player1_id,
        )

        # Envoyer le résultat au joueur 2
        await self.send_player(
            {
                "type": "match_result",
                "content": {
                    "result": "win" if winner_id == player2_id else "lose",
                    "opponent": match["player1"]["nickname"],
                },
            },
            player2_id,
        )

    async def end_match(self, winner_id, match_id):
        # Trouver le match correspondant
        current_match = None
        for match in self.matches:
            if match["room_id"] == match_id:
                match["winner"] = self.players[winner_id].to_dict()
                current_match = match
                break
        if current_match is None:
            logger.error(f"No match found with room_id {match_id}")
            return
        await self.send_match_result(current_match)
        await self.broadcast(
            {
                "type": "match_ended",
                "content": {
                    "tournament_id": self.tournament_id,
                    "match": current_match,
                },
            }
        )
        # Vérifier si tous les matchs du round sont terminés
        if all(m["winner"] is not None for m in self.matches):
            await self.prepare_next_round()
        # await self.start_next_match()

    async def end_tournament(self, final_winner):
        # winners = [match["winner"] for match in self.matches if match["winner"]]
        # final_winner = winners[0] if len(winners) == 1 else "TBD"  # Simplified logic
        await self.broadcast(
            {
                "type": "tournament_end",
                "content": {
                    "winner": final_winner["nickname"],
                    "message": f"{final_winner['nickname']} won the tournament !",
                },
            }
        )

    async def broadcast(self, message):
        logger.info(
            f"[TournamentManager] Broadcasting to all: {json.dumps(message, indent=4)}"
        )
        for player in self.players.values():
            await self.send_player(message, player.user_id)  # Ordre Correct
        # await self.exchange.publish(
        #    aio_pika.Message(body=json.dumps(message).encode()), routing_key="players"
        # )

    async def send_to_players(self, players, message):
        logger.info(
            f"[TournamentManager] Sending to specific players {players}: {json.dumps(message, indent=4)}"
        )
        for player_id in players:
            await self.send_player(message, player_id)  # Ordre Correct

    async def send_player(self, message, user_id):
        logger.info(
            f"Sending message to player {user_id}: {json.dumps(message, indent=4)}"
        )
        await self.exchange.publish(
            aio_pika.Message(body=json.dumps(message).encode()),
            routing_key=f"player-{user_id}",
        )

    class Player:
        def __init__(self, user_id, tournament_id, host, player_num, nickname):
            self.user_id = user_id
            self.tournament_id = tournament_id
            self.host = host
            self.player_num = player_num
            self.nickname = nickname

        @classmethod
        async def create(cls, user_id, tournament_id, host, player_num):
            user = await sync_to_async(PongUser.objects.get)(id=user_id)
            nickname = user.nickname
            return cls(user_id, tournament_id, host, player_num, nickname)

        def to_dict(self):
            return {
                "user_id": self.user_id,
                "tournament_id": self.tournament_id,
                "host": self.host,
                "player_num": self.player_num,
                "nickname": self.nickname,
            }
