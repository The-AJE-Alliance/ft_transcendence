from django.urls import path
from .views import (
    LiveChatFriends,
    LiveChatConversation,
    LiveChatMessages,
    LiveChatBlockUser,
    LiveChatSendInvitation,
)

urlpatterns = [
    path("", LiveChatFriends.as_view(), name="livechat_friends"),
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
        "conversations/<int:conversation_id>/invite/",
        LiveChatSendInvitation.as_view(),
        name="livechat-invite",
    ),
]
