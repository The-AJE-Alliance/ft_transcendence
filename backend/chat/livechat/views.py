from django.contrib.sites import requests
from django.shortcuts import render
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import User, Conversation, Message
from rest_framework import status
from rest_framework.test import APIRequestFactory
from django.db.models import Q
from .serializers import ConversationSerializer, UserSerializer, MessageSerializer
from .queueHandler import QueueHandler
from django.shortcuts import get_object_or_404
from django.db import transaction
import asyncio


class IngestUsers(APIView):
    def save_user(self, user_data):
        user_serializer = UserSerializer(data=user_data)
        if user_serializer.is_valid():
            user_serializer.save()
        else:
            user = get_object_or_404(User, id=user_data["id"])
            user_serializer = UserSerializer(user, data=user_data, partial=True)
            if user_serializer.is_valid():
                user_serializer.save()
                return 200
            else:
                return 400

    def post(self, request):
        token = request.headers.get("Authorization")
        if not token:
            return Response(
                {"error": "No authorization token provided"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        headers = {"Authorization": token}

        user_response = requests.get(
            "https://auth.api.transcendence.fr/users/me/", headers=headers
        )

        if user_response.status_code != 200:
            return Response(
                {"error": "Failed to retrieve user data"},
                status=user_response.status_code,
            )

        if self.save_user(user_response.json()) != 200:
            return Response(
                {"error": "Failed to get a valid data format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        friends_response = requests.get(
            "https://auth.api.transcendence.fr/users/list-friends/", headers=headers
        )
        if friends_response.status_code != 200:
            return Response(
                {"error": "Failed to retrieve friends list"},
                status=friends_response.status_code,
            )
        friends_data = friends_response.json()

        for friend_data in friends_data:
            if self.save_user(friend_data) != 200:
                return Response(
                    {"error": "Failed to get a valid data format"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {"message": "User data and friends ingested successfully"},
            status=status.HTTP_200_OK,
        )


class LiveChatFriends(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friends = request.user.friends.all()
        serializer = UserSerializer(friends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LiveChatConversation(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversation = Conversation.objects.filter(
            Q(user1=request.user) | Q(user2=request.user)
        )
        # Returns all the conversation of the logged users
        serializer = ConversationSerializer(conversation, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LiveChatMessages(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id=None):
        conversation = Conversation.objects.filter(
            Q(user1=request.user, user2_id=user_id)
            | Q(user1_id=user_id, user2=request.user)
        ).first()
        # If no conversation exists, create a new one
        if not conversation:
            conversation = Conversation.objects.create(
                user1=request.user, user2_id=user_id
            )
            # Since it's a new conversation, no messages to retrieve
            return Response(
                {"message": "New conversation created with no messages yet."},
                status=status.HTTP_200_OK,
            )
        # Check if the conversation is blocked by either user
        if (conversation.user1 == request.user and conversation.isBlockedByUser1) or (
            conversation.user2 == request.user and conversation.isBlockedByUser2
        ):
            return Response(
                {"error": "This conversation is blocked."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Mark unread messages as read for the logged-in user
        if conversation.user1 == request.user:
            conversation.hasUnreadMessagesByUser1 = False
        else:
            conversation.hasUnreadMessagesByUser2 = False
        conversation.save()

        # Retrieve messages in the conversation
        messages = Message.objects.filter(conversation=conversation)
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LiveChatBlockUser(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id=None):
        # Toggle block/unblock status for the given conversation
        conversation = Conversation.objects.filter(id=conversation_id).first()
        if conversation:
            if conversation.user1 == request.user:
                conversation.isBlockedByUser1 = not conversation.isBlockedByUser1
            elif conversation.user2 == request.user:
                conversation.isBlockedByUser2 = not conversation.isBlockedByUser2
            else:
                return Response(
                    {"error": "Conversation not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            conversation.save()
            return Response(
                {"status": "Blocked status toggled"}, status=status.HTTP_200_OK
            )
        return Response(
            {"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND
        )


class LiveChatSendInvitation(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("room_id")
        conversation_id = request.data.get("conversation_id")
        if not room_id or not conversation_id:
            return Response(
                {"error": "Conversation ID and room id content are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # TODO: Generate a "Pong" party link or invite link, the link below is a placeholder
        invite_link = f"https://transcendence.fr/pong/remote/join/{room_id}"
        # Prepare the message data for the invitation
        message_data = {
            "messageContent": f"Join me at Pong party! Here's the link: {invite_link}",
            "conversation_id": conversation_id,
        }

        # Create a simulated POST request with the message data
        factory = APIRequestFactory()
        new_request = factory.post(
            path="/send-message/", data=message_data, format="json"
        )
        new_request.user = (
            request.user
        )  # Attach the authenticated user to the new request

        # Call the LiveChatSendMessage view with the simulated request
        send_message_view = LiveChatSendMessage.as_view()
        response = send_message_view(new_request)

        if response.status_code == status.HTTP_201_CREATED:
            return Response(
                {"status": "Invitation sent"}, status=status.HTTP_201_CREATED
            )

        return Response(
            {"error": "Failed to send invitation"}, status=response.status_code
        )
