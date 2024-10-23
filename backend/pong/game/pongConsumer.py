import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .pongGame import PongGame
# class PongConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         await self.accept()
#         await self.send(json.dumps({
#             'message': 'Bienvenue dans le jeu Pong!'
#         }))


class PongConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs) #on fait ca pour appeler le constructeur de la classe parente
        self.pong_game = PongGame()

    async def connect(self):
        await self.accept()
        await self.send(json.dumps({
            'message': 'Bienvenue dans le jeu Pong!'
        }))

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'move_player1':
            direction = data.get('direction', 0)
            self.pong_game.update_player_position(self, player, new_y_normalized)

        elif action == 'move_player2':
            direction = data.get('direction', 0)
            self.pong_game.update_player_position(self, player, new_y_normalized)

        self.pong_game.update_ball_position()

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