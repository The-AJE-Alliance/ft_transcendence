from django.db import models
from django.core.validators import MinLengthValidator
from django.contrib.auth.models import AbstractUser, PermissionsMixin
from .validators import validate_alnum
from .manager import UserManager
from django.conf import settings


class User(AbstractUser, PermissionsMixin):
    username = models.CharField(
        max_length=15, unique=True, validators=[MinLengthValidator(3), validate_alnum]
    )
    nickname = models.CharField(max_length=30, unique=False, blank=False, null=False)
    email = models.EmailField(unique=True, blank=False, null=False)
    # avatar = models.URLField(blank=True, null=True, default='default_avatar_url')
    friends = models.ManyToManyField(
        "self", related_name="friend_set", symmetrical=False, blank=True
    )
    is_online = models.BooleanField(default=False)
    avatar = models.ImageField(
        upload_to="media/avatars/",
        blank=True,
        null=True,
        default="media/avatars/default_avatar.png",
    )

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email", "nickname"]

    objects = UserManager()

    def __str__(self):
        return self.username

    def get_full_name(self):
        return self.nickname


class FriendRequest(models.Model):
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="sent_requests", on_delete=models.CASCADE
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="received_requests",
        on_delete=models.CASCADE,
    )
    status = models.CharField(
        max_length=20,
        choices=(("pending", "Pending"), ("accepted", "Accepted")),
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("from_user", "to_user")
