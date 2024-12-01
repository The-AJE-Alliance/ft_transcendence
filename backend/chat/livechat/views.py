from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ChatUser, Conversation, Message
from rest_framework import status
from rest_framework.test import APIRequestFactory
from django.db.models import Q
from .serializers import ConversationSerializer, UserSerializer, MessageSerializer
from .queueHandler import QueueHandler
from django.shortcuts import get_object_or_404
from django.db import transaction
import asyncio
from django.http import JsonResponse


class LiveChatFriends(APIView):
    def options(self, request, *args, **kwargs):
        response = JsonResponse({"message": "Preflight OK"})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        return response

    # permission_classes = [IsAuthenticated]

    def get(self, request, log_user_id=None):
        # To be removed
        user = get_object_or_404(ChatUser, id=log_user_id)
        if not user:
            return Response(
                {"error": "This user is not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        friends = user.friends.all()  # request.user.friends.all()
        serializer = UserSerializer(friends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LiveChatConversation(APIView):
    # permission_classes = [IsAuthenticated]

    def get(self, request, log_user_id=None):
        # To be removed
        try:
            conversation = Conversation.objects.filter(
                Q(user1_id=log_user_id) | Q(user2_id=log_user_id)
            )
            # Returns all the conversation of the logged users
            serializer = ConversationSerializer(conversation, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LiveChatMessages(APIView):
    # permission_classes = [IsAuthenticated]

    def get(self, request, log_user_id=None, user_id=None):
        try:
            conversation = Conversation.objects.filter(
                Q(user1_id=log_user_id, user2_id=user_id)
                | Q(user1_id=user_id, user2_id=log_user_id)
            ).first()  # Conversation.objects.filter(Q(user1=request.user, user2_id=user_id)| Q(user1_id=user_id, user2=request.user)).first()
            if not conversation:
                conversation = Conversation.objects.create(
                    user1_id=log_user_id, user2_id=user_id
                )
                return Response(
                    {
                        "id": conversation.id,
                        "is_blocked": False,
                        "user1": {
                            "id": conversation.user1_id,
                            "nickname": conversation.user1.nickname,
                        },
                        "user2": {
                            "id": conversation.user2_id,
                            "nickname": conversation.user2.nickname,
                        },
                        "messages": [],
                    },
                    status=status.HTTP_200_OK,
                )
            if conversation.is_blocked():
                return Response(
                    {
                        "id": conversation.id,
                        "is_blocked": True,
                        "user1": {
                            "id": conversation.user1_id,
                            "nickname": conversation.user1.nickname,
                        },
                        "user2": {
                            "id": conversation.user2_id,
                            "nickname": conversation.user2.nickname,
                        },
                        "messages": [],
                    },
                    status=status.HTTP_200_OK,
                )
            conversation.mark_messages_as_read(log_user_id)
            messages = Message.objects.filter(conversation_id=conversation.id).order_by(
                "created_at"
            )
            serializer = MessageSerializer(messages, many=True)
            return Response(
                {
                    "id": conversation.id,
                    "is_blocked": False,
                    "user1": {
                        "id": conversation.user1_id,
                        "nickname": conversation.user1.nickname,
                    },
                    "user2": {
                        "id": conversation.user2_id,
                        "nickname": conversation.user2.nickname,
                    },
                    "messages": serializer.data,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LiveChatBlockUser(APIView):
    # permission_classes = [IsAuthenticated]

    def post(self, request, log_user_id=None, user_id=None):
        conversation = Conversation.objects.filter(
            Q(user1_id=log_user_id, user2_id=user_id)
            | Q(user1_id=user_id, user2_id=log_user_id)
        ).first()
        if conversation:
            if conversation.user1_id == log_user_id:
                conversation.isBlockedByUser1 = not conversation.isBlockedByUser1
            elif conversation.user2_id == log_user_id:
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
    # permission_classes = [IsAuthenticated]

    def post(self, request, log_user_id=None, user_id=None):
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
