from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator
from django.db import models
from django.conf import settings


def validate_alnum(value):
    if not value.isalnum():
        raise ValidationError("%(value)s is not an alpha numeric value")


class PongUser(models.Model):
    username = models.CharField(
        max_length=15,
        unique=True,
        validators=[MinLengthValidator(3), validate_alnum],
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
        if self.loss == 0:
            self.win_ratio = None
        else:
            self.win_ratio = self.wins / self.loss
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Match: {self.player1.username} vs {self.player2.username}"


class Match(models.Model):
    player1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="matches_as_player1",
        on_delete=models.CASCADE,
    )
    player2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="matches_as_player2",
        on_delete=models.CASCADE,
    )
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="matches_won",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    score_player1 = models.IntegerField(default=0)
    score_player2 = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
