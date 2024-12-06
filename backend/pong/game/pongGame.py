import json
import logging
import asyncio
import random

import aio_pika
from aio_pika import ExchangeType
from asgiref.sync import sync_to_async
from django.conf import settings

from game.models import PongUser

logger = logging.getLogger(__name__)


class PongGame:
    def __init__(self, room_id, mode, tournament_id=None):
        self.room_id = room_id
        self.mode = mode
        self.timer = 2
        self.running = False
        self.ball = self.Ball()
        self.tournament_id = tournament_id
        self.player1 = None
        self.player2 = None
        self.max_score = 5
        self.player1_score = 0
        self.player2_score = 0
        self.width = 1.0
        self.height = 1.0
        self.scored = False
        self.connection = None
        self.channel = None
        self.exchange = None
        self.queue = None
        self.task = None
        self.winner = None
        self.consume_task = None
        logger.info(f"PongGame initialized for room_id: {self.room_id}")

    async def start(self):
        try:
            self.connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
            self.channel = await self.connection.channel()
            self.exchange = await self.channel.declare_exchange(
                f"pong-{self.room_id}", ExchangeType.DIRECT, auto_delete=True
            )
            self.queue = await self.channel.declare_queue(auto_delete=True)
            await self.queue.bind(self.exchange, "loop")
            self.consume_task = asyncio.create_task(self.consume_data())
        except Exception as e:
            logger.error(f"{str(e)}")

    async def game_loop(self):
        await asyncio.sleep(self.timer)
        self.running = True
        while self.running:
            try:
                await self.update_ball_position()
                await self.publish_game_state()
                if self.scored:
                    await asyncio.sleep(1)
                    self.scored = False
                await asyncio.sleep(1 / 60)
            except Exception as e:
                logger.error(f"{str(e)}")
                break

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                logger.info("Game loop task canceled.")
        if self.consume_task:
            self.consume_task.cancel()
            try:
                await self.consume_task
            except asyncio.CancelledError:
                logger.info("Consume data task canceled.")
        if self.channel:
            await self.channel.close()
        if self.connection:
            await self.connection.close()
        logger.info(f"PongGame for room_id {self.room_id} has been stopped.")

    async def publish_game_state(self):
        data = {
            "type": "state",
            "content": {
                "player1": self.player1.__dict__,
                "player2": self.player2.__dict__,
                "ball": self.ball.__dict__,
                "player1_score": self.player1_score,
                "player2_score": self.player2_score,
            },
        }

        await self.exchange.publish(
            aio_pika.Message(json.dumps(data).encode()), routing_key="players"
        )
        # for player_id in [self.player1_id, self.player2_id]:
        #     await self.exchange.publish(
        #         aio_pika.Message(json.dumps(data).encode()),
        #         routing_key=f"player-{player_id}",
        #     )

    async def consume_data(self):
        async with self.queue.iterator() as iterator:
            async for message in iterator:
                async with message.process():
                    await self.dispatch(message.body.decode())

    async def dispatch(self, message):
        data = json.loads(message)
        if data["type"] == "setup":
            await self.setup(data["content"])
        elif data["type"] == "move":
            self.update_player_position(data["content"])

    async def setup(self, content):
        logger.info(f"Player {content['player']} setup received.")
        response = {"type": "setup", "content": {"ready": False, "timer": self.timer}}
        if self.running or content["mode"] != self.mode:
            # pass  # TODO: problem
            logger.error(
                f"Cannot start game: running={self.running}, content['mode']={content['mode']}, self.mode={self.mode}"
            )
            return

        logger.info(f"Game mode: {self.mode}")

        if self.mode == "local":
            self.player1 = await self.Player.create(True)
            self.player2 = await self.Player.create(False)
            response["content"]["ready"] = True
        else:
            player = content["player"]
            user_id = content.get("user_id")
            if player in [1, 2]:
                player_attr = f"player{player}"
                if getattr(self, player_attr) is None or not isinstance(
                    getattr(self, player_attr), self.Player
                ):
                    setattr(
                        self,
                        player_attr,
                        await self.Player.create(player == 1, user_id=user_id),
                    )
            else:
                # Gérer les numéros de joueur invalides
                logger.error(f"Invalid player number: {player}")
                return
            if self.player1 and self.player2:
                response["content"]["ready"] = True

        if response["content"]["ready"]:
            self.running = True
            response["content"]["nicks"] = {}
            response["content"]["nicks"]["player1"] = (
                self.player1.nickname if self.player1.nickname else "Player 1"
            )
            response["content"]["nicks"]["player2"] = (
                self.player2.nickname if self.player2.nickname else "Player 2"
            )
            logger.info(f"Launching game {self.room_id}")
            self.task = asyncio.create_task(self.game_loop())
        await self.exchange.publish(
            aio_pika.Message(json.dumps(response).encode()), routing_key="players"
        )

    def update_player_position(self, content):
        player, action = content["player"], content["action"]
        pad = self.player1 if player == 1 else self.player2
        step = pad.step if action == "down" else -pad.step
        pad.y = min(max(pad.y + step, 0), 1 - pad.height)

    async def update_ball_position(self):
        if not self.ball:
            logger.error("Balle non initialisée. Impossible de mettre à jour.")
            return
        self.ball.x += self.ball.velocity[0]
        self.ball.y += self.ball.velocity[1]

        wall, player, player1, player2 = self.check_collisions()
        if not wall and not player:
            return

        await self.update_score(wall, player, player1, player2)

        await self.revert_ball_direction(wall, player, player1, player2)

    async def revert_ball_direction(self, wall, player, player1, player2):
        if not player1 and not player2:
            self.ball.velocity[1] *= -1
            if self.ball.y < 0.5:
                self.ball.y += 0.005
            else:
                self.ball.y -= 0.005
        elif player1:
            self.ball.velocity[0] *= -1
            self.ball.x += 0.005
        elif player2:
            self.ball.velocity[0] *= -1
            self.ball.x -= 0.005

    def check_collisions(self):
        if not self.player1 or not self.player2:
            logger.error("Player1 or Player2 is not initialized.")
            return False, False, False, False
        if (
            self.ball.x - self.ball.radius <= self.player1.width
            and self.player1.y <= self.ball.y <= self.player1.y + self.player1.height
        ):
            return False, True, True, False

        elif (
            self.ball.x + self.ball.radius >= 1 - self.player2.width
            and self.player2.y <= self.ball.y <= self.player2.y + self.player2.height
        ):
            return False, True, False, True
        # check collisions with walls
        # upper wall ( y = 0 ) and lower wall ( y = 1 )
        if self.ball.y - self.ball.radius <= 0 or self.ball.y + self.ball.radius >= 1:
            return True, False, False, False
        # left wall
        if self.ball.x - self.ball.radius <= 0:
            return True, False, True, False
        # right wall
        elif self.ball.x + self.ball.radius >= 1:
            return True, False, False, True

        return False, False, False, False

    async def update_score(self, wall, player, player1, player2):
        # if collision with wall on player1 side
        if wall and player1:
            self.player2_score += 1
            self.scored = True
            await self.reset_game()

        # if collision with wall on player2 side
        elif wall and player2:
            self.player1_score += 1
            self.scored = True
            await self.reset_game()

        if self.player1_score >= self.max_score or self.player2_score >= self.max_score:
            await self.end_game()

    async def end_game(self):
        self.running = False
        self.ball.y = 0.5
        self.winner = 1 if self.player1_score >= self.max_score else 2

        if self.mode == "tournament" and self.tournament_id:
            winner_id = (
                self.player1.user_id if self.winner == 1 else self.player2.user_id
            )
            tournament_message = {
                "type": "end_match",
                "content": {
                    "winner_id": winner_id,
                    "match_id": self.room_id,
                },
            }
            # Publier le message au TournamentManager
            tournament_exchange_name = f"tournament-{self.tournament_id}"
            tournament_exchange = await self.channel.declare_exchange(
                tournament_exchange_name, ExchangeType.DIRECT, auto_delete=True
            )
            await tournament_exchange.publish(
                aio_pika.Message(json.dumps(tournament_message).encode()),
                routing_key="tournament",
            )
        # TODO: update to db if remote

        await self.publish_game_state()
        data = {
            "type": "end",
            "content": {
                "winner": self.winner,
            },
        }
        await self.exchange.publish(
            aio_pika.Message(json.dumps(data).encode()), routing_key="players"
        )

    async def reset_game(self):
        self.ball.reset()
        self.player1.reset()
        self.player2.reset()
        await self.queue.purge()

    class Player:
        def __init__(
            self,
            left,
            width=0.02,
            height=0.2,
            color="white",
            user_id=None,
            nickname=None,
        ):
            self.left = left
            self.user_id = user_id
            self.nickname = nickname
            self.color = color
            self.width = width
            self.height = height
            self.x = None
            self.y = None
            self.step = None
            self.move = None
            self.reset(width=width, height=height)

        @classmethod
        async def create(cls, left, user_id=None):
            if user_id:
                user = await sync_to_async(PongUser.objects.get)(id=user_id)
                nickname = user.nickname
            else:
                nickname = None
            return cls(left, user_id=user_id, nickname=nickname)

        def reset(self, width=0.02, height=0.2):
            self.width = width
            self.height = height
            self.x = 0 if self.left else 1 - self.width
            self.y = 0.4
            self.step = 0.10
            self.move = 0

    class Ball:
        def __init__(self, x=0.5, radius=0.022, color="white"):
            self.x = x
            self.y = None
            self.radius = radius
            self.color = color
            self.velocity = None
            self.reset(radius=radius)

        def reset(self, x=0.5, radius=0.022):
            self.x = x
            self.y = random.uniform(0.2, 0.8)
            self.radius = radius
            self.velocity = self.randomize_velocity()

        def randomize_velocity(self):
            speed_x = random.uniform(0.01, 0.013)
            speed_y = random.uniform(0.01, 0.013)

            velocity = [speed_x, speed_y]
            if random.randint(0, 1):
                velocity[0] *= -1
            if random.randint(0, 1):
                velocity[1] *= -1
            return velocity
