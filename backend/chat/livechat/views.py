from django.shortcuts import render
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

# todo: 2/ When a new message is received while the logged user is not on the chat page


class IngestUsers(APIView):
    # Notice that we received a POST from a succesful user
    # Trigger a GET User data
    # Save the user data in our DB (create or update)
    # Loop over the friend list
    #   Trigger a GET User data
    #   Save the user data in our DB (create or update)
    def get(self, request):
        return


class LiveChatPage(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Returns the page html & format
        return


class LiveChatFriends(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Returns all the friends of the logged users
        return


class LiveChatConversation(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Returns all the conversation of the logged users
        return


class LiveChatMessages(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # If it exists and not conversation is not blocked
        #   Method to change the right hasUnreadMessages to FALSE
        #   Returns all the conversation of the logged users
        # Create a conversation and returns NULL
        return


class LiveChatBlockUser(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # If Unblock
        #   Block and returns 200
        # Unblock and returns 200
        return


class LiveChatSendMessage(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Atomic method
        # Send the message to web socket ?
        # Create a new message in the DB
        return


class LiveChatSendInvitation(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # generate a Pong party link
        # trigger a post to LiveChatSendMessage
        return
