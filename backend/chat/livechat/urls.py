from django.urls import path
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

from .views import (
    LiveChatFriends,
    LiveChatConversation,
    LiveChatMessages,
    LiveChatBlockUser,
)

router = DefaultRouter()
router.register(r"users", LiveChatFriends, basename="chatuser")

urlpatterns = [
    path("", LiveChatFriends.as_view(), name="livechat_friends"),
    path(
        "friends/<int:log_user_id>/",
        LiveChatFriends.as_view(),
        name="livechat-friends",
    ),
    path(
        "conversations/<int:log_user_id>/",
        LiveChatConversation.as_view(),
        name="livechat-conversations",
    ),
    path(
        "conversations/<int:log_user_id>/<int:user_id>/messages/",
        LiveChatMessages.as_view(),
        name="livechat-messages",
    ),
    path(
        "conversations/<int:log_user_id>/<int:user_id>/block/",
        LiveChatBlockUser.as_view(),
        name="livechat-block",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
