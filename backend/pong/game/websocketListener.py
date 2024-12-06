import json
import asyncio
import logging
from asyncio import sleep

from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .pongGame import PongGame
from .queueHandler import QueueHandler
from .tournament import TournamentManager
from .tournamentHandler import TournamentHandler

logger = logging.getLogger(__name__)
game_tasks = {}
tournament_tasks = {}


class WebsocketListener(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pong_game = None
        self.tournament = None
        self.tournament_id = None
        self.user_id = None
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
                await self.setup_tournament(data)
            case _:
                await self.queue_handler.publish_to_loop(data)

    async def setup_tournament(self, data):
        user = self.scope["user"]
        if isinstance(user, AnonymousUser):
            data["type"] = "unauthorized"
            await self.send(json.dumps(data))
            await self.close()
            return
        logger.info(
            f"[WebsocketListener] setup_tournament called with data: {json.dumps(data, indent=4)}"
        )
        content = data["content"]
        self.host = content["host"]
        self.tournament_id = content["tournament_id"]
        self.user_id = content["user_id"]
        logger.info(
            f"TournamentManager started for tournament_id: {self.tournament_id}"
        )
        if not self.tournament_id:
            logger.error("Tournament ID is None!")
            return
        if self.tournament_id in tournament_tasks:
            self.tournament = tournament_tasks[self.tournament_id]
        else:
            self.tournament = TournamentManager(self.tournament_id, self.user_id)
            tournament_tasks[self.tournament_id] = asyncio.create_task(
                self.tournament.start()
            )
        self.queue_handler = TournamentHandler(self, self.tournament_id, self.user_id)
        await self.queue_handler.start(data)
        logger.info(
            f"[WebsocketListener] setup_tournament completed for tournament_id: {self.tournament_id}"
        )

    async def setup(self, data):
        user = self.scope["user"]
        content = data["content"]
        logger.info(
            f"Received setup message with content: {json.dumps(content, indent=4)}"
        )
        self.mode = content["mode"]
        self.host = content["host"]
        if isinstance(user, AnonymousUser):
            self.user_id = None
        else:
            self.user_id = user.id
        self.room_id = content["room_id"]
        if self.mode != "local" and not self.user_id:
            data["type"] = "unauthorized"
            await self.send(json.dumps(data))
            await self.close()
            return
        if self.host:
            if self.room_id not in game_tasks:
                logger.info("Created game")
                self.pong_game = PongGame(
                    self.room_id,
                    self.mode,
                    tournament_id=content.get("tournament_id"),
                )
                game_tasks[self.room_id] = asyncio.create_task(self.pong_game.start())

        self.queue_handler = QueueHandler(self, self.room_id, 1 if self.host else 2)
        await sleep(1 / 2)
        await self.queue_handler.start(data)

    async def disconnect(self, close_code):
        logger.warning("Client déconnecté")
        if self.queue_handler:
            await self.queue_handler.stop()
        if self.pong_game:
            await self.pong_game.stop()
            if self.room_id in game_tasks:
                del game_tasks[self.room_id]
        if self.tournament:
            await self.tournament.stop()
            if self.tournament_id in tournament_tasks:
                del tournament_tasks[self.tournament_id]
        await super().disconnect(close_code)
