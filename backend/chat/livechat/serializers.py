from rest_framework import serializers
from .models import Conversation, ChatUser, Message


class UserSerializer(serializers.ModelSerializer):
    # Utiliser PrimaryKeyRelatedField pour gérer les IDs des amis
    friends = serializers.PrimaryKeyRelatedField(
        queryset=ChatUser.objects.all(), many=True, required=False
    )

    class Meta:
        model = ChatUser
        fields = (
            "id",
            "username",
            "nickname",
            "friends",
            "is_online",
        )
        read_only_fields = [
            "id",
            "is_online",
        ]


class ConversationSerializer(serializers.ModelSerializer):
    user1 = UserSerializer(read_only=True)
    user2 = UserSerializer(read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "user1",
            "user2",
            "isBlockedByUser1",
            "isBlockedByUser2",
            "hasUnreadMessagesByUser1",
            "hasUnreadMessagesByUser2",
            "created_at",
        ]


class MessageSerializer(serializers.ModelSerializer):
    conversation = ConversationSerializer(read_only=True)
    sentFromUser = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sentFromUser",
            "messageContent",
            "created_at",
        ]
