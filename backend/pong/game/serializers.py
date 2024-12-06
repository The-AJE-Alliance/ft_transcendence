from rest_framework import serializers
from .models import Match, PongUser


class PongUserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = PongUser
        fields = [
            "nickname",
            "wins",
            "loss",
            "win_ratio",
            "tournaments_won",
            "tournaments_played",
        ]


class MatchSerializer(serializers.ModelSerializer):
    opponent = serializers.SerializerMethodField()
    result = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            "id",
            "opponent",
            "score_player1",
            "score_player2",
            "result",
            "created_at",
        ]

    def get_opponent(self, obj):
        user = self.context.get("user")
        if not user:
            return None
        return obj.player2.nickname if obj.player1 == user else obj.player1.nickname

    def get_result(self, obj):
        user = self.context.get("user")
        if not user:
            return None
        if obj.winner == user:
            return "Win"
        elif obj.winner is None:
            return "Draw"
        return "Loss"
