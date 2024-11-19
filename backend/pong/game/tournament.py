import json
import asyncio
import random
import aio_pika
from aio_pika import ExchangeType
from django.conf import settings
from .pongGame import PongGame

class PongTournament:
	def __init__(self, name):
		self.name = name
		self.players = []
		self.ready_players = [] 
		self.matches = [] #a list of tuples (player1, player2, match_id)
		self.current_matches = {} #a list of PongGame instances
		self.state = "waiting"
		self.connection = None
		self.channel = None
		self.exchange = None
		self.winner = None
	
	async def start(self):
		self.connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
		self.channel = await self.connection.channel()
		self.exchange = await self.channel.declare_exchange(
			f"tournament-{self.name}", ExchangeType.DIRECT, auto_delete=True
		)
            
	async def add_player(self, player_id):
		if self.state != "waiting":
			# display a message "cannot add a player, tournament already started"
			return False
		
		if player_id not in self.players:
			self.players.append(player_id)
			await self.notify("player_joined", {"player": player_id})
			return True

		return False

	async def remove_player(self, player_id):
		if player_id in self.players:
			self.players.remove(player_id)
			self.ready_players.discard(player_id)
			await self.notify("player_left", {"player": player_id})

	async def ready_player(self, player_id):
		if player_id in self.players:
			self.ready_players.add(player_id)
			await self.notify("player_ready", {"player": player_id})

	async def start_tournament(self):
		self.state = "playing"
		await self.create_matches()
		await self.notify("tournament started", {"matches": self.matches})
	
	async def create_matches(self):
		players = self.players.copy()
		random.shuffle(players)

		while len(players) > 1:
			player1 = players.pop()
			player2 = players.pop()
			match_id = f"match-{player1}-{player2}"
			self.matches.append((player1, player2, match_id))
			await self.start_match(player1, player2, match_id)
		
		# not sure about the way to handle last remaining player in odd cases
		if players:
			self.matches.append((players[0], None, None))

	async def start_match(self, player1, player2, match_id):
		match_exchange = await self.channel.declare_exchange(
            f"pong-{match_id}", ExchangeType.DIRECT, auto_delete=True
        )
		game = PongGame(match_id, "remote")
		self.current_matches[match_id] = game
		await game.start()

		await match_exchange.publish(aio_pika.Message(
                json.dumps({"type": "match_started", "player1": player1, "player2": player2}).encode()
            ),
            routing_key="players",
        )

	#when a match ends : to process the results and notify connected users
	async def update_match_result(self, match_id, winner):
		if match_id in self.current_matches:
			del self.current_matches[match_id]
		await self.notify("match_completed", {"match_id": match_id, "winner": winner})
		if not self.current_matches:
			await self.check_tournament_completion()

	#checks if the tournament is complete after a match ends
	async def check_tournament_completion(self):
		if all(m[2] is None or m[2] not in self.current_matches for m in self.matches):
			self.state = "completed"
			await self.notify("tournament_completed", {"winner": self.players[0]})
	
	async def notify(self, event_type, content):
		data = {"type": event_type, "content": content}
		await self.exchange.publish(
            aio_pika.Message(json.dumps(data).encode()), routing_key="clients"
        )