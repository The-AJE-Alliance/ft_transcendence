class PongGame:
    def __init__(self):
        self.ball_position = [0, 0]
        self.ball_velocity = [1, 1]
        self.player1_position = 0
        self.player2_position = 0
        self.player1_score = 0
        self.player2_score = 0


    def get_game_state(self):
        return {
            'player1': {
                'position': self.player1_position,
                'normalized_position': self.player1_position * self.height
            },
            'player2': {
                'position': self.player2_position,
                'normalized_position': self.player2_position * self.height
            },
            'ball': {
                'x': self.ball_position['x'],
                'y': self.ball_position['y']
            },
            'score': {
                'player1': self.player1_score,
                'player2': self.player2_score
            }
        }

    def update_player_position(self, player, new_y_normalized):
        if player == 1:
            self.player1_position = new_y_normalized
        elif player == 2:
            self.player2_position = new_y_normalized


    def update_ball_position(self):
        self.ball_position['x'] += self.ball_velocity['x']
        self.ball_position['y'] += self.ball_velocity['y']

        self.check_collision_with_walls()
        collision_player1, collision_player2 = self.check_collision_with_players()

        if collision_player1:
            self.ball_velocity['x'] = -self.ball_velocity['x']
            self.update_score(1)

        elif collision_player2:
            self.ball_velocity['x'] = -self.ball_velocity['x']
            self.update_score(2)


    def check_collision_with_walls(self):
        if self.ball_position['y'] <= 0 or self.ball_position['y'] >= 1:
            self.ball_velocity['y'] = -self.ball_velocity['y']


    def check_collision_with_players(self):
        collision_player1 = (
                self.ball_position['x'] <= (self.player_width / self.width) and
                self.player1_position <= self.ball_position['y'] <= (
                            self.player1_position + (self.player_height / self.height))
        )

        collision_player2 = (
                self.ball_position['x'] >= (1 - self.player_width / self.width) and
                self.player2_position <= self.ball_position['y'] <= (
                            self.player2_position + (self.player_height / self.height))
        )

        return collision_player1, collision_player2