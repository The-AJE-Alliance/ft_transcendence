class PongGame:
    def __init__(self):
        self.ball_position = [0.5, 0.5]
        self.ball_velocity = [0.01, 0.01]
        self.player1_position = 0.5
        self.player2_position = 0.5
        self.player1_score = 0
        self.player2_score = 0
        self.width = 1.0
        self.height = 1.0
        self.player_width = 0.02 #largeur de la raquette
        self.player_height = 0.2


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
                'x': self.ball_position[0],
                'y': self.ball_position[1]
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
        self.ball_position[0] += self.ball_velocity[0]
        self.ball_position[1] += self.ball_velocity[1]

        self.check_collision_with_walls()
        collision_player1, collision_player2 = self.check_collision_with_players()

        if collision_player1:
            self.ball_velocity[0] = -self.ball_velocity[0]
            self.update_score(1)

        elif collision_player2:
            self.ball_velocity[0] = -self.ball_velocity[0]
            self.update_score(2)


    def check_collision_with_walls(self):
        ##collisions avec le mur inf : axe Y
        ##si la balle touche le mur on reset à 0 la coordonnée 'y' et on inverse sa direction
        if self.ball_position[1] <= 0:
            self.ball_position[1] = 0 
            self.ball_velocity[1] = -self.ball_velocity[1]

        ##avec le mur sup
        elif self.ball_position[1] >= 1:  # Si la balle touche le mur supérieur
            self.ball_position[1] = 1  # Réajuster la position de la balle
            self.ball_velocity[1] = -self.ball_velocity[1]  # Inverser la direction

        #  ##collisions avec le mur inf : axe Y : murs de gauche et de droite
        if self.ball_position[0] <= 0:  
            self.ball_position[0] = 0  
            self.ball_velocity[0] = -self.ball_velocity[0]  

        elif self.ball_position[0] >= 1:  
            self.ball_position[0] = 1  
            self.ball_velocity[0] = -self.ball_velocity[0]


    def check_collision_with_players(self):
        collision_player1 = (
                self.ball_position[0] <= (self.player_width / self.width) and
                self.player1_position <= self.ball_position[1] <= (
                            self.player1_position + (self.player_height / self.height))
        )

        collision_player2 = (
                self.ball_position[0] >= (1 - self.player_width / self.width) and
                self.player2_position <= self.ball_position[1] <= (
                            self.player2_position + (self.player_height / self.height))
        )

        return collision_player1, collision_player2