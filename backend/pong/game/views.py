from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import MatchSerializer, PongUserSerializer
from .models import Match, PongUser
from rest_framework import viewsets


# ViewSets define the view behavior.
class PongUserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = PongUser.objects.all()
    serializer_class = PongUserSerializer


class MatchHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        matches = Match.objects.filter(player1=request.user) | Match.objects.filter(
            player2=request.user
        )
        matches = matches.order_by("-created_at")
        serializer = MatchSerializer(matches, many=True, context={"request": request})
        return Response(serializer.data)

    def create_match(player1, player2, winner, score_player1, score_player2):
        match = Match.objects.create(
            player1=player1,
            player2=player2,
            winner=winner,
            score_player1=score_player1,
            score_player2=score_player2,
        )
        match.save()
        return match
