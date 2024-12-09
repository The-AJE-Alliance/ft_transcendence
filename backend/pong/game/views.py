from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    MatchSerializer,
    PongUserSerializer,
    TournamentFinalRankingSerializer,
)
from .models import PongUser, Match
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny


# ViewSets define the view behavior.
class PongUserViewSet(viewsets.ReadOnlyModelViewSet):
    # permission_classes = [IsAuthenticated]
    queryset = PongUser.objects.all()
    serializer_class = PongUserSerializer

    @action(detail=True, methods=["GET"], url_path="history")
    def history(self, request, pk=None):
        user = self.get_object()
        matchs = user.matchs
        serializer = MatchSerializer(matchs, many=True, context={"user": user})
        return Response(serializer.data)


class FinalRankingView(APIView):
    permission_classes = [AllowAny]  # Modifier selon vos besoins

    def get(self, request, tournament_id):
        matches = Match.objects.filter(tournament_id=tournament_id)
        if not matches.exists():
            return Response(
                {"detail": "No Tournament matches the given query."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Calculer le classement basé sur les victoires
        ranking = {}
        for match in matches:
            if match.winner:
                winner = match.winner
                if winner.id not in ranking:
                    ranking[winner.id] = {
                        "player_id": winner.id,  # Inclure player_id
                        "nickname": winner.nickname,
                        "wins": 0,
                    }
                ranking[winner.id]["wins"] += 1

        # Trier les joueurs par nombre de victoires décroissant
        sorted_ranking = sorted(ranking.values(), key=lambda x: x["wins"], reverse=True)
        # Ajouter la position
        for idx, player in enumerate(sorted_ranking):
            player["position"] = idx + 1

        ranking_list = sorted_ranking

        # Préparer les données des matchs
        matches_data = matches.values(
            "id",
            "player1__nickname",
            "player2__nickname",
            "winner__nickname",
            "score_player1",
            "score_player2",
            "created_at",
        )

        data = {"ranking": ranking_list, "matches": list(matches_data)}

        serializer = TournamentFinalRankingSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
