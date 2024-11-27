from django.shortcuts import render
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import PongUser
from .serializers import ConversationSerializer

class UserStats(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id=None):
        userStats = PongUser.objects.filter(id=user_id)
        if !userStats:
            return Response(
                    {"error": "User not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        
        serializer = UserStatsSerializer(userStats, many=False) 
        #TODO: Review the many=False
        return Response(serializer.data, status=status.HTTP_200_OK)
