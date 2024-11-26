from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator
from django.db import models


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
