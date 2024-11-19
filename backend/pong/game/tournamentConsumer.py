import json
from pydoc import text
from channels.generic.websocket import AsyncWebsocketConsumer
from .tournament import PongTournament

tournaments = {} # dictionary to store active tournaments

class TournamentConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.tournament = None
        self.player_id = None
        self.is_host = False

    async def connect(self):
        await self.accept()
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        match data["type"]:
            case "create_tournament":
                await self.create_tournament(data["content"])
            case "join_tournament":
                await self.join_tournament(data["content"])
            case "ready":
                await self.mark_ready(data["content"])
            case "lock_tournament":
                await self.lock_tournament()
            case _:
                await self.send_error("Invalid message type.")
            


    async def disconnect(self, close_code):
        if self.tournament:
            if self.is_host:
                await self.tournament.notify("tournament_stopped", {"reason": "Host disconnected."})
                del tournaments[self.tournament.name]
            else:
                await self.tournament.remove_player(self.player_id)
