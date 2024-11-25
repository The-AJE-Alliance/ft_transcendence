import json
import asyncio
import channels.exceptions
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .pongGame import PongGame
from .tournament import TournamentManager
from .queueHandler import QueueHandler

logger = logging.getLogger(__name__)
game_tasks = {}
tournaments = {}

class WebsocketListener(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pong_game = None
        self.tournament = None
        self.tournament_id = None
        self.queue_handler = None
        self.mode = None
        self.host = None
        self.room_id = None

    async def connect(self):
        await self.accept()

    async def receive(self, text_data):
        data = json.loads(text_data)
        match data["type"]:
            case "move":
                await self.queue_handler.publish_to_loop(data)
            case "setup":
                await self.setup(data)
            case "setup_tournament":
                # logger.error("Created TOURNAMENT")
                await self.setup_tournament(data)
            case "lock_tournament":
                await self.lock_tournament()

    async def setup_tournament(self, data):
        content = data["content"]
        self.mode = content["mode"]
        self.host = content["host"]
        self.tournament_id = content["tournament_id"]
        self.tournament = TournamentManager(self.tournament_id)
        tournaments[self.tournament_id] = asyncio.create_task(self.tournament.start())
        self.queue_handler = QueueHandler(self, self.tournament_id, 1)
        await self.queue_handler.start(data)

    async def setup(self, data):
        user = self.scope["user"]
        content = data["content"]
        self.mode = content["mode"]
        self.host = content["host"]

        self.room_id = "room-" + content["room_id"]
        if self.mode != "local" and type(user) is AnonymousUser:
            data["type"] = "unauthorized"
            await self.send(json.dumps(data))
            await self.close()
            return
        if self.host:
            if self.room_id in game_tasks:
                pass  # TODO: problem
            logger.info("Created game")
            self.pong_game = PongGame(self.room_id, self.mode)
            game_tasks[self.room_id] = asyncio.create_task(self.pong_game.start())

        if self.host:
            if self.room_id in game_tasks:
                pass  # TODO: problem
            logger.info("Created game")
            self.pong_game = PongGame(self.room_id, self.mode)
            game_tasks[self.room_id] = asyncio.create_task(self.pong_game.start())

        else:
            if self.host:
                if self.room_id in game_tasks:
                    pass  # TODO: problem
                logger.info("Created game")
                self.pong_game = PongGame(self.room_id, self.mode)
                game_tasks[self.room_id] = asyncio.create_task(self.pong_game.start())

            self.queue_handler = QueueHandler(
                self, self.room_id, (1 if self.host else 2)
            )
            await self.queue_handler.start(data)

    async def lock_tournament(self):
        tournament = tournaments.get(self.tournament_id) 
        if not tournament:
            return
        await self.tournament.lock_tournament()


    async def disconnect(self, close_code):
        logger.warning("Client déconnecté")
        if self.queue_handler:
            await self.queue_handler.stop()
        if self.host and self.pong_game:
            await self.pong_game.stop()
            game_tasks[self.room_id].cancel()
            game_tasks[self.room_id] = None
        channels.exceptions.StopConsumer()
