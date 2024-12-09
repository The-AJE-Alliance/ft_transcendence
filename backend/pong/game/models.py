from django.db import models
from django.db.models import Q


class PongUser(models.Model):
    username = models.CharField(
        max_length=15,
        unique=True,
    )
    nickname = models.CharField(max_length=30, unique=True, blank=False, null=False)
    is_online = models.BooleanField(default=False)
    friends = models.ManyToManyField(
        "self", related_name="friend_set", symmetrical=False, blank=True
    )

    # specific fields of the app that will not be synced
    wins = models.IntegerField(default=0)
    loss = models.IntegerField(default=0)
    win_ratio = models.FloatField(default=None, null=True)
    tournaments_played = models.IntegerField(default=0)
    tournaments_won = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        self.win_ratio = None if self.loss == 0 else self.wins / self.loss
        super().save(*args, **kwargs)

    @property
    def matchs(self):
        return Match.objects.filter(Q(player1=self) | Q(player2=self))


class Match(models.Model):
    player1 = models.ForeignKey(
        PongUser,
        related_name="matches_as_player1",
        on_delete=models.CASCADE,
    )
    player2 = models.ForeignKey(
        PongUser,
        related_name="matches_as_player2",
        on_delete=models.CASCADE,
    )
    winner = models.ForeignKey(
        PongUser,
        related_name="matches_won",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    score_player1 = models.IntegerField(default=0)
    score_player2 = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    tournament_id = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Match: {self.player1.username} vs {self.player2.username}"


class Tournament(models.Model):
    tournament_id = models.CharField(max_length=50, unique=True)

    matches = models.ManyToManyField("Match", related_name="tournaments", blank=True)

    def get_final_ranking(self):
        ranking = []
        return ranking

    def get_all_matches_data(self):
        data = []
        for match in self.matches.all():
            data.append(
                {
                    "match_id": match.id,
                    "player1": {
                        "id": match.player1.id,
                        "nickname": match.player1.nickname,
                    },
                    "player2": {
                        "id": match.player2.id,
                        "nickname": match.player2.nickname,
                    },
                    "winner": (
                        {"id": match.winner.id, "nickname": match.winner.nickname}
                        if match.winner
                        else None
                    ),
                    "score_player1": match.score_player1,
                    "score_player2": match.score_player2,
                    "created_at": match.created_at,
                }
            )
        return data
