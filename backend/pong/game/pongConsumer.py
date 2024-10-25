import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from .pongGame import PongGame

class PongConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs) #on fait ca pour appeler le constructeur de la classe parente
        self.pong_game = PongGame()
        self.game_loop_task = None

    async def connect(self):
        await self.accept()
        await self.send_game_state()
        self.game_loop_task = asyncio.create_task(self.game_loop())
    
    async def game_loop(self):
        while True:
            self.pong_game.update_ball_position()  # Mettre à jour la position de la balle
            await self.send_game_state()  # Envoyer l'état mis à jour du jeu
            await asyncio.sleep(1/30) 

    async def receive(self, text_data):
        data = json.loads(text_data)
        player = data.get('player')
        action = data.get('action')
        self.pong_game.update_player_position(player, action)

        await self.send_game_state()

    async def send_game_state(self):
        game_state = {
            'player1_position': self.pong_game.player1_position,
            'player2_position': self.pong_game.player2_position,
            'ball_position': self.pong_game.ball_position,
        }
        await self.send(text_data=json.dumps(game_state))

    async def disconnect(self, close_code):
        print("Client déconnecté")