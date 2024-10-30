import logging
import asyncio

logger = logging.getLogger(__name__)


class PongGame:
    def __init__(self):
        self.ball_position = [0.5, 0.5]
        self.ball_velocity = [0.01, 0.014]
        self.player1_position = 0.5
        self.player2_position = 0.5
        self.player1_score = 0
        self.player2_score = 0
        self.width = 1.0
        self.height = 1.0
        self.player_width = 0.02
        self.player_height = 0.2
        self.scored = False

    def get_game_state(self):
        return {
            "player1": {
                "position": self.player1_position,
                "normalized_position": self.player1_position * self.height,
            },
            "player2": {
                "position": self.player2_position,
                "normalized_position": self.player2_position * self.height,
            },
            "ball": {"x": self.ball_position[0], "y": self.ball_position[1]},
            "score": {"player1": self.player1_score, "player2": self.player2_score},
        }

    def update_player_position(self, player, action):
        if player == 1:
            if action == "move_up":
                if self.player1_position - (self.player_height / 2) >= 0.05:
                    self.player1_position -= 0.05
            elif action == "move_down":
                if self.player1_position + (self.player_height / 2) <= 1:
                    self.player1_position += 0.05

        elif player == 2:
            if action == "move_up":
                if self.player2_position - (self.player_height / 2) >= 0.05:
                    self.player2_position -= 0.05
            elif action == "move_down":
                if self.player2_position + (self.player_height / 2) <= 1:
                    self.player2_position += 0.05

    def update_ball_position(self):
        self.ball_position[0] += self.ball_velocity[0]
        self.ball_position[1] += self.ball_velocity[1]

        wall, player, player1, player2 = self.check_collisions()
        if not wall and not player:
            return

        self.update_score(wall, player, player1, player2)

        self.revert_ball_direction(wall, player, player1, player2)

    def revert_ball_direction(self, wall, player, player1, player2):
        if not player1 and not player2:
            self.ball_velocity[1] *= -1
            if self.ball_position[1] < 0.5:
                self.ball_position[1] += 0.005
            else:
                self.ball_position[1] -= 0.005
        elif player1:
            self.ball_velocity[0] *= -1
            self.ball_position[0] += 0.005
        elif player2:
            self.ball_velocity[0] *= -1
            self.ball_position[0] -= 0.005

    def check_collisions(self):
        # check collisions with players
        collision_player1 = self.ball_position[0] <= (
            self.player_width / self.width
        ) and self.player1_position <= self.ball_position[1] <= (
            self.player1_position + (self.player_height / self.height)
        )
        if collision_player1:
            return False, True, True, False

        collision_player2 = self.ball_position[0] >= (
            1 - self.player_width / self.width
        ) and self.player2_position <= self.ball_position[1] <= (
            self.player2_position + (self.player_height / self.height)
        )
        if collision_player2:
            return False, True, False, True

        # check collisions with walls
        # upper wall ( y = 0 )
        if self.ball_position[1] <= 0:
            return True, False, False, False

        # lower wall ( y = 1 )
        elif self.ball_position[1] >= 1:
            return True, False, False, False

        # left wall
        if self.ball_position[0] <= 0:
            return True, False, True, False

        # right wall
        elif self.ball_position[0] >= 1:
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
        self.ball_position = [0.5, 0.5]
        self.player1_position = 0.5
        self.player2_position = 0.5
        
