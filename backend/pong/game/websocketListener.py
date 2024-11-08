import json
import asyncio
import channels.exceptions
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .pongGame import PongGame
from .queueHandler import QueueHandler
from urllib.parse import parse_qsl

logger = logging.getLogger(__name__)
game_tasks = {}


class WebsocketListener(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pong_game = None
        self.queue_handler = None
        self.mode = None
        self.host = None
        self.room_id = None

    async def connect(self):
        query_params = dict(parse_qsl(self.scope["query_string"].decode("utf-8")))
        logger.error(query_params)
        self.mode = query_params["mode"]
        self.host = query_params["host"]
        self.room_id = "room-" + query_params["room_id"]

        logger.info(self.host)
        if self.host:
            if self.room_id in game_tasks:
                pass  # TODO: problem
            logger.info("Created game")
            self.pong_game = PongGame(self.room_id)
            game_tasks[self.room_id] = asyncio.create_task(self.pong_game.start())

        self.queue_handler = QueueHandler(self, self.room_id, (1 if self.host else 2))
        await self.accept()
        await self.queue_handler.start()

    async def receive(self, text_data):
        await self.queue_handler.publish_paddle_movement(text_data)

    # async def send_game_state(self):
    #     game_state = {
    #         "player1": self.pong_game.player1.__dict__,
    #         "player2": self.pong_game.player2.__dict__,
    #         "ball": self.pong_game.ball.__dict__,
    #         "player1_score": self.pong_game.player1_score,
    #         "player2_score": self.pong_game.player2_score,
    #     }
    #     await self.send(text_data=json.dumps(game_state))

    async def disconnect(self, close_code):
        logger.warning("Client déconnecté")
        if self.queue_handler:
            await self.queue_handler.stop()
        if self.host and self.pong_game:
            await self.pong_game.stop()
            game_tasks[self.room_id].cancel()
            game_tasks[self.room_id] = None
        channels.exceptions.StopConsumer()
