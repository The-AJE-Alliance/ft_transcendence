from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from .serializers import MatchSerializer, PongUserSerializer
from .models import Match, PongUser
from rest_framework import viewsets


# ViewSets define the view behavior.
class PongUserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = PongUser.objects.all()
    serializer_class = PongUserSerializer


class MatchHistoryView(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MatchSerializer

    def get_queryset(self):
        user = self.request.user
        return Match.objects.filter(Q(player1=user) | Q(player2=user))
