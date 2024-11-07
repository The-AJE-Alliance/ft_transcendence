import json
import logging
import asyncio
import random

import aio_pika
from aio_pika import ExchangeType
from django.conf import settings

logger = logging.getLogger(__name__)


class PongGame:
    def __init__(self, room_id):
        self.room_id = room_id
        self.ball = self.Ball()
        self.ball_velocity = self.ball.randomize_velocity()
        self.player1 = self.Pad(True)
        self.player2 = self.Pad(False)
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

    async def start(self):
        try:
            self.connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
            self.channel = await self.connection.channel()
            self.exchange = await self.channel.declare_exchange(
                f"pong-{self.room_id}", ExchangeType.DIRECT, auto_delete=True
            )
            self.queue = await self.channel.declare_queue(auto_delete=True)
            await self.queue.bind(self.exchange, "loop")
            await self.consume_paddle_movement()
            self.task = asyncio.create_task(self.game_loop())
        except Exception as e:
            logger.error(f"{str(e)}")

    async def game_loop(self):
        while True:
            try:
                self.update_ball_position()
                await self.publish_game_state()
                if self.scored:
                    await asyncio.sleep(1)
                    self.scored = False
                await asyncio.sleep(1 / 60)
            except Exception as e:
                logger.error(f"{str(e)}")
                break

    async def publish_game_state(self):
        game_state = {
            "player1": self.player1.__dict__,
            "player2": self.player2.__dict__,
            "ball": self.ball.__dict__,
            "player1_score": self.player1_score,
            "player2_score": self.player2_score,
        }

        await self.exchange.publish(
            aio_pika.Message(json.dumps(game_state).encode()), routing_key="players"
        )

    async def consume_paddle_movement(self):
        async with self.queue.iterator() as iterator:
            async for message in iterator:
                async with message.process():
                    self.update_player_position(message.decode())

    def update_player_position(self, message):
        player, action = json.loads(message)
        pad = self.player1 if player == 1 else self.player2
        step = pad.step if action == "move_down" else -pad.step
        pad.y = min(max(pad.y + step, 0), 1 - pad.height)

    def update_ball_position(self):
        self.ball.x += self.ball_velocity[0]
        self.ball.y += self.ball_velocity[1]

        wall, player, player1, player2 = self.check_collisions()
        if not wall and not player:
            return

        self.update_score(wall, player, player1, player2)

        self.revert_ball_direction(wall, player, player1, player2)

    def revert_ball_direction(self, wall, player, player1, player2):
        if not player1 and not player2:
            self.ball_velocity[1] *= -1
            if self.ball.y < 0.5:
                self.ball.y += 0.005
            else:
                self.ball.y -= 0.005
        elif player1:
            self.ball_velocity[0] *= -1
            self.ball.x += 0.005
        elif player2:
            self.ball_velocity[0] *= -1
            self.ball.x -= 0.005

    def check_collisions(self):
        # check collisions with players
        # collision_player1 = self.ball.x <= (
        #     self.player_width / self.width
        # ) and self.player1_position <= self.ball.y <= (
        #     self.player1_position + (self.player_height / self.height)
        # )
        collision_player1 = (
            self.ball.x <= self.player1.width
            and self.player1.y <= self.ball.y <= self.player1.y + self.player1.height
        )
        if collision_player1:
            return False, True, True, False

        # collision_player2 = self.ball.x >= (
        #     1 - self.player_width / self.width
        # ) and self.player2_position <= self.ball.y <= (
        #     self.player2_position + (self.player_height / self.height)
        # )
        collision_player2 = (
            self.ball.x >= 1 - self.player2.width
            and self.player2.y <= self.ball.y <= self.player2.y + self.player2.height
        )
        if collision_player2:
            return False, True, False, True

        # check collisions with walls
        # upper wall ( y = 0 )
        if self.ball.y <= 0:
            return True, False, False, False

        # lower wall ( y = 1 )
        elif self.ball.y >= 1:
            return True, False, False, False

        # left wall
        if self.ball.x <= 0:
            return True, False, True, False

        # right wall
        elif self.ball.x >= 1:
            return True, False, False, True

        return False, False, False, False

    def update_score(self, wall, player, player1, player2):
        # if collision with wall on player1 side
        if wall and player1:
            self.player2_score += 1
            self.scored = True
            self.reset_game()

        # if collision with wall on player2 side
        elif wall and player2:
            self.player1_score += 1
            self.scored = True
            self.reset_game()

    def reset_game(self):
        self.ball.reset()
        self.player1.reset()
        self.player2.reset()
        self.ball_velocity = self.ball.randomize_velocity()

    class Pad:
        def __init__(self, left, width=0.02, height=0.2, color="white"):
            self.left = left
            self.color = color
            self.width = width
            self.height = height
            self.x = None
            self.y = None
            self.step = None
            self.move = None
            self.reset(width=width, height=height)

        def reset(self, width=0.02, height=0.2):
            self.width = width
            self.height = height
            self.x = 0 if self.left else 1 - self.width
            self.y = 0.4
            self.step = 0.08
            self.move = 0

    class Ball:
        def __init__(self, x=0.5, radius=0.022, color="white"):
            self.x = x
            self.y = None
            self.radius = radius
            self.color = color
            self.reset(radius=radius)

        def reset(self, x=0.5, radius=0.022):
            self.x = x
            self.y = random.uniform(0.2, 0.8)
            self.radius = radius

        def randomize_velocity(self):
            speed_x = random.uniform(0.01, 0.015)
            speed_y = random.uniform(0.01, 0.015)

            velocity = [speed_x, speed_y]
            if random.randint(0, 1):
                velocity[0] *= -1
            if random.randint(0, 1):
                velocity[1] *= -1
            return velocity
