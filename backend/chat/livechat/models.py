from django.db import models
from django.core.validators import MinLengthValidator
from .validators import validate_alnum
from django.conf import settings


class ChatUser(models.Model):
    username = models.CharField(
        max_length=15, unique=True, validators=[MinLengthValidator(3), validate_alnum]
    )
    nickname = models.CharField(max_length=30, unique=False, blank=False, null=False)
    friends = models.ManyToManyField(
        "self", related_name="friend_set", symmetrical=False, blank=True
    )
    is_online = models.BooleanField(default=False)


class Conversation(models.Model):
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="conversations_as_user1",
        on_delete=models.CASCADE,
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="conversations_as_user2",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    isBlockedByUser1 = models.BooleanField(default=False)
    isBlockedByUser2 = models.BooleanField(default=False)
    hasUnreadMessagesByUser1 = models.BooleanField(default=False)
    hasUnreadMessagesByUser2 = models.BooleanField(default=False)

    def __str__(self):
        return f"Conversation between {self.user1} and {self.user2}"

    class Meta:
        unique_together = ("user1", "user2")
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if self.user1 > self.user2:
            self.user1, self.user2 = self.user2, self.user1
        super().save(*args, **kwargs)


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    sentFromUser = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="author",
        on_delete=models.CASCADE,
    )
    messageContent = models.CharField(
        max_length=20000, unique=False, blank=False, null=False
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
