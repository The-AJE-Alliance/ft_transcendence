import logging
import asyncio
import random

logger = logging.getLogger(__name__)


class PongGame:
    def __init__(self):
        self.ball = self.Ball()
        self.ball_velocity = self.ball.randomize_velocity()
        self.player1 = self.Pad(True)
        self.player2 = self.Pad(False)
        self.player1_score = 0
        self.player2_score = 0
        self.width = 1.0
        self.height = 1.0
        self.scored = False




    def update_player_position(self, player, action):
        if player == 1:
            if action == "move_up":
                if self.player1.y - (self.player1.height / 2) >= 0.0:
                    self.player1.y = max(0.0, round(self.player1.y - 0.10, 2))

            elif action == "move_down":
                if (self.player1.y + self.player1.height + 0.10) <= 1.0:
                    self.player1.y = min(1.0 - self.player1.height, round(self.player1.y + 0.10, 2))

        elif player == 2:
            if action == "move_up":
                if self.player2.y - (self.player2.height / 2) >= 0.0:
                    self.player2.y = max(0.0, round(self.player2.y - 0.10, 2))
            elif action == "move_down":
                if (self.player2.y + self.player2.height + 0.10) <= 1.0:
                    self.player2.y = min(1.0 - self.player2.height, round(self.player2.y + 0.10, 2))

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
        collision_player1 = self.ball.x <= self.player1.width and self.player1.y <= self.ball.y <= self.player1.y + self.player1.height
        if collision_player1:
            return False, True, True, False

        # collision_player2 = self.ball.x >= (
        #     1 - self.player_width / self.width
        # ) and self.player2_position <= self.ball.y <= (
        #     self.player2_position + (self.player_height / self.height)
        # )
        collision_player2 = self.ball.x >= 1 - self.player2.width and self.player2.y <= self.ball.y <= self.player2.y + self.player2.height
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
            self.reset(width=width, height=height)
        
        def reset(self, width=0.02, height=0.2):
            self.width = width
            self.height = height
            self.x = 0 if self.left else 1 - self.width
            self.y = 0.4
            self.step = 0.05
            self.move = 0
        
    class Ball:
        def __init__(self, x=0.5, radius=0.022, color="white"):
            self.x = x
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

