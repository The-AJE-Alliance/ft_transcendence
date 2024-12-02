from django.urls import path, include
from rest_framework import routers, serializers, viewsets
from rest_framework.permissions import IsAuthenticated
from .models import PongUser

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


# ViewSets define the view behavior.
class PongUserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = PongUser.objects.all()
    serializer_class = PongUserSerializer


# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
router.register(r"users", PongUserViewSet)

# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    path("", include(router.urls)),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
]