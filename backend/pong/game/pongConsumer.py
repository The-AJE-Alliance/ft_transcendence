import json
import asyncio
import channels.exceptions
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .pongGame import PongGame

logger = logging.getLogger(__name__)


class PongConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(
            *args, **kwargs
        )  # on fait ca pour appeler le constructeur de la classe parente
        self.pong_game = PongGame()
        self.game_loop_task = None
        self.connected = False

    async def connect(self):
        await self.accept()
        await self.send_game_state()
        self.connected = True
        self.game_loop_task = asyncio.create_task(self.game_loop())

    async def game_loop(self):
        while self.connected:
            self.pong_game.update_ball_position()
            await self.send_game_state()
            if self.pong_game.scored == True:
                await asyncio.sleep(1)
                self.pong_game.scored == False
            await asyncio.sleep(1 / 30)

    async def receive(self, text_data):
        data = json.loads(text_data)
        player = data.get("player")
        action = data.get("action")
        self.pong_game.update_player_position(player, action)

        await self.send_game_state()

    async def send_game_state(self):
        game_state = {
            "player1_position": self.pong_game.player1_position,
            "player2_position": self.pong_game.player2_position,
            "ball_position": self.pong_game.ball_position,
            "player1_score": self.pong_game.player1_score,
            "player2_score": self.pong_game.player2_score,
        }
        await self.send(text_data=json.dumps(game_state))

    async def disconnect(self, close_code):
        logger.warning("Client déconnecté")
        self.connected = False
        channels.exceptions.StopConsumer()
