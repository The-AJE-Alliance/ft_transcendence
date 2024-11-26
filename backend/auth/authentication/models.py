from django.db import models
from django.core.validators import MinLengthValidator
from django.contrib.auth.models import AbstractUser, PermissionsMixin
from .manager import UserManager
from django.conf import settings
from model_utils import FieldTracker
import pyotp

from django.core.exceptions import ValidationError


def validate_alnum(value):
    if not value.isalnum():
        raise ValidationError("%(value)s is not an alpha numeric value")


class User(AbstractUser, PermissionsMixin):
    username = models.CharField(
        max_length=15, unique=True, validators=[MinLengthValidator(3), validate_alnum]
    )
    nickname = models.CharField(max_length=30, unique=True, blank=False, null=False)
    email = models.EmailField(unique=True, blank=False, null=False)
    friends = models.ManyToManyField(
        "self", related_name="friend_set", symmetrical=False, blank=True
    )
    is_online = models.BooleanField(default=False)
    avatar = models.ImageField(
        upload_to="avatars",
        blank=True,
        null=False,
        default="avatars/default_avatar.png",
    )
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=64, blank=True, null=True)
    AUTH_METHOD_CHOICES = [
        ("classic", "Classic"),
        ("oauth42", "OAuth42"),
    ]

    auth_method = models.CharField(
        max_length=20,
        choices=AUTH_METHOD_CHOICES,
        default="classic",
    )
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email", "nickname"]

    objects = UserManager()
    tracker = FieldTracker()

    def __str__(self):
        return self.username

    def get_full_name(self):
        return self.nickname

    def enable_two_factor(self):
        self.two_factor_secret = pyotp.random_base32(length=32)
        self.two_factor_enabled = True
        self.save()


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
