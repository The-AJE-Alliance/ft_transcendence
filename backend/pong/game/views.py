from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .serializers import MatchSerializer, PongUserSerializer
from .models import Match, PongUser
from rest_framework import viewsets


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
