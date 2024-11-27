from rest_framework import serializers
from .models import PongUser


class UserStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongUser
        fields = [
            "username",
            "nickname",
            "is_online",
            "friends",
            "wins",
            "loss",
            "win_ratio",
            "created_at",
        ]

