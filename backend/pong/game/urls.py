from django.urls import path, include
from django.contrib.auth.models import User
from rest_framework import routers, serializers, viewsets
from .models import PongUser


# Serializers define the API representation.
class PongUserSerializer(serializers.HyperlinkedModelSerializer):
    friends = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, required=False
    )

    class Meta:
        model = PongUser
        fields = ["username", "nickname", "is_online", "friends", "wins"]


# ViewSets define the view behavior.
class PongUserViewSet(viewsets.ModelViewSet):
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
