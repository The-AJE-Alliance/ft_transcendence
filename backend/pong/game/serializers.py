from rest_framework import serializers
from .models import Match, PongUser


# Serializers define the API representation.
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
        request_user = self.context["request"].user
        return (
            obj.player2.username
            if obj.player1 == request_user
            else obj.player1.username
        )

    def get_result(self, obj):
        request_user = self.context["request"].user
        if obj.winner == request_user:
            return "Win"
        elif obj.winner is None:
            return "Draw"
        return "Loss"
