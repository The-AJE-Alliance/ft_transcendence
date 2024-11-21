import json
import aio_pika
from aio_pika import ExchangeType

class TournamentManager:
    def __init__(self, tournament_id):
        self.tournament_id = tournament_id
        self.players = []  
        self.matches = []  # List of matches in the tournament
        self.current_match_index = -1  # Index of the current match
        self.exchange = None

    async def start(self):
        
        self.connection = await aio_pika.connect_robust("amqp://localhost/")
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange(
            f"tournament-{self.tournament_id}", ExchangeType.FANOUT
        )


    async def add_player(self, player):
        if player in self.players:
            return
        self.players.append(player)
        await self.broadcast({
            "type": "player_joined",
            "content": {"player": player}
        })
      

    async def remove_player(self, player):
        if player in self.players:
            self.players.remove(player)
            await self.broadcast({
                "type": "player_left",
                "content": {"player": player}
            })
    

    ### Lock Tournament ###
    async def lock_tournament(self):
        if len(self.players) < 2:
            return
        self.generate_bracket()
        await self.broadcast({
            "type": "tournament_locked",
            "content": {"players": self.players}
        })
    

   
    def generate_bracket(self):
        self.matches = [
            {"player1": self.players[i], "player2": self.players[i + 1], "winner": None}
            for i in range(0, len(self.players) - 1, 2)
        ]
        

   
    async def start_tournament(self):
        if not self.matches:

            return
        await self.start_next_match()


    async def start_next_match(self):
        self.current_match_index += 1
        if self.current_match_index >= len(self.matches):
            await self.end_tournament()
            return

        current_match = self.matches[self.current_match_index]
        await self.broadcast({
            "type": "match_ready",
            "content": {
                "tournament_id": self.tournament_id,
                "match": current_match,
                "room_id": f"room-{self.current_match_index}"
            }
        })


    async def end_match(self, winner):
        if self.current_match_index < 0 or self.current_match_index >= len(self.matches):
           
            return

        current_match = self.matches[self.current_match_index]
        current_match["winner"] = winner

        await self.broadcast({
            "type": "match_ended",
            "content": {
                "tournament_id": self.tournament_id,
                "match": current_match
            }
        })
       
        await self.start_next_match()

    
    async def end_tournament(self):
        winners = [match["winner"] for match in self.matches if match["winner"]]
        final_winner = winners[0] if len(winners) == 1 else "TBD"  # Simplified logic
        await self.broadcast({
            "type": "tournament_end",
            "content": {"winner": final_winner}
        })
       


    async def broadcast(self, message):
        await self.exchange.publish(
            aio_pika.Message(body=json.dumps(message).encode()),
            routing_key=""
        )
