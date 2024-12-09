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


class FinalRankingPlayerSerializer(serializers.Serializer):
    player_id = serializers.IntegerField()
    nickname = serializers.CharField()
    position = serializers.IntegerField()


class FinalRankingMatchSerializer(serializers.Serializer):
    match_id = serializers.IntegerField(source="id")
    player1 = serializers.CharField(source="player1__nickname")
    player2 = serializers.CharField(source="player2__nickname")
    winner = serializers.CharField(source="winner__nickname", allow_null=True)
    score_player1 = serializers.IntegerField()
    score_player2 = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class TournamentFinalRankingSerializer(serializers.Serializer):
    ranking = FinalRankingPlayerSerializer(many=True)
    matches = FinalRankingMatchSerializer(many=True)
