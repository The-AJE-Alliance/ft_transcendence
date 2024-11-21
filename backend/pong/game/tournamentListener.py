import json
import asyncio
import aio_pika
from aio_pika import ExchangeType
from .tournament import Tournament
from .pongGame import PongGame

class TournamentListener:
    def __init__(self):
        self.tournaments = {}  

    async def start(self):
        self.connection = await aio_pika.connect_robust("amqp://localhost/")
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange(
            "tournament_exchange", ExchangeType.DIRECT
        )

    
        self.queue = await self.channel.declare_queue("tournament_queue", auto_delete=True)
        await self.queue.bind(self.exchange, routing_key="tournament")

    
        await self.queue.consume(self.process_message)

    async def process_message(self, message):
        async with message.process():
            data = json.loads(message.body)
            message_type = data["type"]
            content = data["content"]

            if message_type == "create_tournament":
                await self.create_tournament(content)
            elif message_type == "lock_tournament":
                await self.lock_tournament(content["tournament_id"])
            elif message_type == "start_tournament":
                await self.start_tournament(content["tournament_id"])
            elif message_type == "end_match":
                await self.end_match(content["tournament_id"], content["winner"])

    async def create_tournament(self, content):
        tournament_id = content["tournament_id"]
        if tournament_id in self.tournaments:
            print(f"Tournament {tournament_id} already exists.")
            return

        # Create a new TournamentManager instance
        tournament = Tournament(tournament_id)
        await tournament.start()
        self.tournaments[tournament_id] = tournament
        print(f"Tournament {tournament_id} created.")

    async def lock_tournament(self, tournament_id):
        tournament = self.tournaments.get(tournament_id)
        if not tournament:
            print(f"Tournament {tournament_id} not found.")
            return

        await tournament.lock_tournament()
        print(f"Tournament {tournament_id} locked.")

    async def start_tournament(self, tournament_id):
        tournament = self.tournaments.get(tournament_id)
        if not tournament:
            print(f"Tournament {tournament_id} not found.")
            return

        await tournament.start_tournament()
        print(f"Tournament {tournament_id} started.")

    async def end_match(self, tournament_id, winner):
        tournament = self.tournaments.get(tournament_id)
        if not tournament:
            print(f"Tournament {tournament_id} not found.")
            return

        await tournament.end_match(winner)
        print(f"Match in tournament {tournament_id} ended. Winner: {winner}.")
