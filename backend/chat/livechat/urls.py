# from django.urls import path, include
# from django.contrib.auth.models import User
# from rest_framework import routers, serializers, viewsets


# Serializers define the API representation.
# class UserSerializer(serializers.HyperlinkedModelSerializer):
#    class Meta:
#        model = User
#        fields = ["url", "username", "email", "is_staff"]


# ViewSets define the view behavior.
# class UserViewSet(viewsets.ModelViewSet):
#    queryset = User.objects.all()
#    serializer_class = UserSerializer


# Routers provide an easy way of automatically determining the URL conf.
# router = routers.DefaultRouter()
# router.register(r"users", UserViewSet)

# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
# urlpatterns = [
#    path("", include(router.urls)),
#    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
# ]


from django.urls import path
from .views import (
    LiveChatFriends,
    LiveChatConversation,
    LiveChatMessages,
    LiveChatBlockUser,
    LiveChatSendMessage,
    LiveChatSendInvitation,
)

urlpatterns = [
    path("friends/", LiveChatFriends.as_view(), name="livechat-friends"),
    path(
        "conversations/", LiveChatConversation.as_view(), name="livechat-conversations"
    ),
    path(
        "conversations/<int:conversation_id>/messages/",
        LiveChatMessages.as_view(),
        name="livechat-messages",
    ),
    path(
        "conversations/<int:conversation_id>/block/",
        LiveChatBlockUser.as_view(),
        name="livechat-block",
    ),
    path(
        "conversations/<int:conversation_id>/send/",
        LiveChatSendMessage.as_view(),
        name="livechat-send",
    ),
    path(
        "conversations/<int:conversation_id>/invite/",
        LiveChatSendInvitation.as_view(),
        name="livechat-invite",
    ),
]
