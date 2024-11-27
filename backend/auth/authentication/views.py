import base64
from urllib.parse import urlparse
from django.core.files.base import ContentFile
import os
from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.permissions import (
    IsAuthenticated,
    AllowAny,
)
import qrcode
import io
from django.contrib.auth import authenticate
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import redirect
from django.views import View
from django.conf import settings
from django.http import JsonResponse, HttpResponseBadRequest
from .models import User, FriendRequest
from .serializers import UserSerializer
from .permissions import IsOwner
from .serializers import FriendRequestSerializer
import logging
import requests
import pyotp

logger = logging.getLogger(__name__)


class PendingFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending_requests = FriendRequest.objects.filter(
            to_user=request.user, status="pending"
        )
        serializer = FriendRequestSerializer(pending_requests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SendFriendRequestView(APIView):
    def post(self, request):
        username = request.data.get("username")
        if username == request.user.username:
            return Response(
                {"error": "You cannot add yourself as a friend."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            recipient = User.objects.get(username=username)
            if FriendRequest.objects.filter(
                from_user=request.user, to_user=recipient
            ).exists():
                return Response(
                    {"error": "Friend request already sent."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            FriendRequest.objects.create(from_user=request.user, to_user=recipient)
            return Response(
                {"message": "Friend request sent."}, status=status.HTTP_201_CREATED
            )
        except User.DoesNotExist:
            return Response(
                {"error": "User does not exist."}, status=status.HTTP_404_NOT_FOUND
            )


class AcceptFriendRequestView(APIView):
    def post(self, request):
        from_user_id = request.data.get("from_user_id")
        try:
            friend_request = FriendRequest.objects.get(
                from_user=from_user_id, to_user=request.user
            )
            # Accepter la demande d'ami
            request.user.friends.add(friend_request.from_user)
            friend_request.from_user.friends.add(request.user)
            friend_request.delete()  # Supprimer la demande après acceptation
            return Response(
                {"message": "Friend request accepted."}, status=status.HTTP_200_OK
            )
        except FriendRequest.DoesNotExist:
            return Response(
                {"error": "Friend request does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )


class DeclineFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from_user_id = request.data.get("from_user_id")
        try:
            friend_request = FriendRequest.objects.get(
                from_user=from_user_id, to_user=request.user, status="pending"
            )
            friend_request.delete()
            return Response(
                {"message": "Friend request declined."}, status=status.HTTP_200_OK
            )
        except FriendRequest.DoesNotExist:
            return Response(
                {"error": "Friend request does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsOwner]

    def get_permissions(self):
        if self.action and hasattr(action, "permission_classes"):
            return [permission() for permission in action.permission_classes]
        elif self.action in ["update", "destroy", "partial_update", "retrieve"]:
            permission_classes = [IsOwner]
        else:
            permission_classes = self.permission_classes
        return [permission() for permission in permission_classes]

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.auth_method == "oauth42":
            return Response(
                {"detail": "Cannot delete a profile authenticated via API42."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if user.auth_method == "oauth42":
            if list(request.data.keys()) != ["nickname"]:
                return Response(
                    {"detail": "Cannot modify a profile authenticated via API42."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        if user.auth_method == "oauth42":
            allowed_fields = {"nickname"}
            if not set(request.data.keys()).issubset(allowed_fields):
                return Response(
                    {
                        "detail": "Cannot modify a profile authenticated via API42, except the nickname."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().partial_update(request, *args, **kwargs)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="me",
    )
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="list-friends",
    )
    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="friends",
    )
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="send-friend-request",
    )
    def send_friend_request(self, request):
        to_user_id = request.data.get("to_user_id")
        to_user = User.objects.get(id=to_user_id)
        if FriendRequest.objects.filter(
            from_user=request.user, to_user=to_user
        ).exists():
            return Response(
                {"detail": "Friend request already sent"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        FriendRequest.objects.create(from_user=request.user, to_user=to_user)
        return Response(
            {"detail": "Friend request sent"}, status=status.HTTP_201_CREATED
        )

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="accept-friend-request",
    )
    def accept_friend_request(self, request):
        from_user_id = request.data.get("from_user_id")
        friend_request = FriendRequest.objects.filter(
            from_user__id=from_user_id, to_user=request.user, status="pending"
        ).first()

        if not friend_request:
            return Response(
                {"detail": "Friend request not found or already accepted"},
                status=status.HTTP_404_NOT_FOUND,
            )
        friend_request.status = "accepted"
        friend_request.save()
        request.user.friends.add(friend_request.from_user)
        friend_request.from_user.friends.add(request.user)
        return Response(
            {"detail": "Friend request accepted"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["post"], url_path="add-friend")
    def add_friend(self, request):
        friend_username = request.data.get("username")
        if not friend_username:
            return Response(
                {"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            friend = User.objects.get(username=friend_username)
            request.user.friends.add(friend)
            return Response(
                {"message": f"{friend_username} added as a friend"},
                status=status.HTTP_200_OK,
            )
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

    def list_friends(self, request):
        user = request.user
        friends = user.friends.all()
        serializer = self.get_serializer(friends, many=True)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[AllowAny],
        authentication_classes=[],
        url_path="check-email",
    )
    def check_email(self, request):
        email = request.query_params.get("email")
        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "Email already exists"}, status=status.HTTP_409_CONFLICT
            )
        return Response({"message": "Email is available"}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[AllowAny],
        authentication_classes=[],
        url_path="check-username",
    )
    def check_username(self, request):
        username = request.query_params.get("username")
        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already exists"}, status=status.HTTP_409_CONFLICT
            )
        return Response({"message": "Username is available"}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[AllowAny],
        authentication_classes=[],
        url_path="check-nickname",
    )
    def check_nickname(self, request):
        nickname = request.query_params.get("nickname")
        if User.objects.filter(nickname=nickname).exists():
            return Response(
                {"error": "Nickname already exists"}, status=status.HTTP_409_CONFLICT
            )
        return Response({"message": "Nickname is available"}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[AllowAny],
        authentication_classes=[],
        url_path="login_with_42",
    )
    def login_with_42(self, request):
        code = request.query_params.get("code")
        if not code:
            return Response(
                {"error": "Authorization code is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Échange du code contre un token d'accès
        token_url = "https://api.intra.42.fr/oauth/token"
        client_id = settings.CLIENT_ID
        client_secret = settings.CLIENT_SECRET
        redirect_uri = settings.REDIRECT_URI

        data = {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        response = requests.post(token_url, data=data)
        if response.status_code != 200:
            return Response(response.json(), status=status.HTTP_400_BAD_REQUEST)
        access_token = response.json().get("access_token")
        user_info_url = "https://api.intra.42.fr/v2/me"
        headers = {"Authorization": f"Bearer {access_token}"}
        user_response = requests.get(user_info_url, headers=headers)

        if user_response.status_code != 200:
            return Response(user_response.json(), status=status.HTTP_400_BAD_REQUEST)

        user_data = user_response.json()
        username = user_data.get("login")
        email = user_data.get("email")

        user, created = User.objects.get_or_create(
            username=username, defaults={"email": email}
        )
        access_token = str(AccessToken.for_user(user))

        # Rediriger vers le frontend avec le token dans l'URL ou via un cookie
        response = redirect(
            f"https://api.auth.transcendence.fr/login/success?token={access_token}"
        )
        return response

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="change-password",
    )
    def change_password(self, request):
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not user.check_password(current_password):
            return Response(
                {"error": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if current_password == new_password:
            return Response(
                {"error": "New password cannot be the same as the current password"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response(
            {"message": "Password updated successfully"}, status=status.HTTP_200_OK
        )

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="enable-two-factor",
    )
    def enable_two_factor(self, request):
        user = request.user
        if user.two_factor_enabled:
            return Response(
                {"detail": "2FA is already enabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Générer un nouveau secret
        user.two_factor_secret = pyotp.random_base32()
        user.save()

        # Générer l'URI TOTP
        totp_uri = pyotp.totp.TOTP(user.two_factor_secret).provisioning_uri(
            name=user.email, issuer_name="Transcendence"
        )

        # Générer le QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        img = qr.make_image(fill="black", back_color="white")

        # Convertir l'image en base64 pour l'envoyer au frontend
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return Response({"qr_code": img_str}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="confirm-two-factor",
    )
    def confirm_two_factor(self, request):
        user = request.user
        otp_code = request.data.get("otp_code")

        if not otp_code:
            return Response(
                {"detail": "OTP code is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        totp = pyotp.TOTP(user.two_factor_secret)
        if totp.verify(otp_code):
            user.two_factor_enabled = True
            user.save()
            return Response(
                {"detail": "2FA enabled successfully."}, status=status.HTTP_200_OK
            )
        else:
            return Response(
                {"detail": "Invalid OTP code."}, status=status.HTTP_400_BAD_REQUEST
            )

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        url_path="verify-two-factor",
    )
    def verify_two_factor(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        otp_code = request.data.get("otp_code")

        user = authenticate(username=username, password=password)
        if user and user.two_factor_enabled:
            totp = pyotp.TOTP(user.two_factor_secret)
            if totp.verify(otp_code):
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                user.is_online = True
                user.save()
                response = Response({"access": access_token}, status=status.HTTP_200_OK)
                cookie_max_age = 3600 * 24 * 14  # 14 jours
                response.set_cookie(
                    "refresh_token",
                    str(refresh),
                    max_age=cookie_max_age,
                    httponly=True,
                )

                return response
            else:
                return Response({"error": "Invalid OTP code"}, status=400)
        else:
            return Response({"error": "Invalid credentials"}, status=400)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="disable-two-factor",
    )
    def disable_two_factor(self, request):
        user = request.user
        if not user.two_factor_enabled:
            return Response(
                {"detail": "2FA is not enabled."}, status=status.HTTP_400_BAD_REQUEST
            )

        user.two_factor_enabled = False
        user.two_factor_secret = ""
        user.save()
        return Response({"detail": "2FA has been disabled."}, status=status.HTTP_200_OK)


class RegisterView(CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        avatar = request.FILES.get("avatar")

        user = User.objects.create_user(
            username=data["username"],
            email=data["email"],
            password=data["password"],
            nickname=data["nickname"],
        )
        if avatar:
            user.avatar = avatar

        user.save()
        return Response(
            {"message": "User created successfully"},
            status=status.HTTP_201_CREATED,
        )


class CookieTokenRefreshSerializer(TokenRefreshSerializer):
    refresh = None

    def validate(self, attrs):
        attrs["refresh"] = self.context["request"].COOKIES.get("refresh_token")
        if attrs["refresh"]:
            return super().validate(attrs)
        else:
            raise InvalidToken("No valid token found in cookie 'refresh_token'")


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)

        if user:
            if user.two_factor_enabled:
                return Response(
                    {"detail": "2FA required"}, status=status.HTTP_403_FORBIDDEN
                )
            else:
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                user.is_online = True
                user.save()
                response = Response({"access": access_token}, status=status.HTTP_200_OK)
                cookie_max_age = 3600 * 24 * 14  # 14 jours
                response.set_cookie(
                    "refresh_token",
                    str(refresh),
                    max_age=cookie_max_age,
                    httponly=True,
                )
                return response
        else:
            return Response(
                {"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST
            )


class CookieTokenRefreshView(TokenRefreshView):
    def finalize_response(self, request, response, *args, **kwargs):
        if response.data.get("refresh"):
            cookie_max_age = 3600 * 24 * 14  # 14 days
            response.set_cookie(
                "refresh_token",
                response.data["refresh"],
                max_age=cookie_max_age,
                httponly=True,
            )
            del response.data["refresh"]
        return super().finalize_response(request, response, *args, **kwargs)

    serializer_class = CookieTokenRefreshSerializer


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)

    def post(self, request):
        try:
            user = request.user
            user.is_online = False
            user.save()

            refresh_token = request.COOKIES.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            response = Response(status=status.HTTP_205_RESET_CONTENT)
            response.delete_cookie("refresh_token")
            return response
        # return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RedirectTo42View(View):
    def get(self, request):
        authorization_url = f"https://api.intra.42.fr/oauth/authorize?client_id={settings.CLIENT_ID}&redirect_uri={settings.REDIRECT_URI}&response_type=code"
        return redirect(authorization_url)


class AuthCallbackView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        if not code:
            return HttpResponseBadRequest("Authorization code not found.")

        token_url = "https://api.intra.42.fr/oauth/token"
        data = {
            "grant_type": "authorization_code",
            "client_id": settings.CLIENT_ID,
            "client_secret": settings.CLIENT_SECRET,
            "redirect_uri": settings.REDIRECT_URI,
            "code": code,
        }

        response = requests.post(token_url, data=data)
        if response.status_code == 200:
            access_token = response.json().get("access_token")

            user_info_url = "https://api.intra.42.fr/v2/me"
            headers = {"Authorization": f"Bearer {access_token}"}
            user_response = requests.get(user_info_url, headers=headers)

            if user_response.status_code == 200:
                user_data = user_response.json()
                username = user_data.get("login")
                email = user_data.get("email")
                avatar_url = user_data.get("image", {}).get("link")

                user, created = User.objects.get_or_create(
                    username=username, defaults={"email": email}
                )

                if created or not user.avatar:
                    if avatar_url:
                        try:
                            image_response = requests.get(
                                avatar_url, allow_redirects=True
                            )
                            image_response.raise_for_status()
                            parsed_url = urlparse(avatar_url)
                            file_name = os.path.basename(parsed_url.path)
                            image_content = ContentFile(image_response.content)
                            user.avatar.save(file_name, image_content, save=True)
                        except Exception as e:
                            user.avatar = "avatars/default_avatar.png"
                            user.save()
                    else:
                        user.avatar = "avatars/default_avatar.png"
                        user.save()
                if avatar_url:
                    user.avatar_url = avatar_url
                    user.save()
                user.auth_method = "oauth42"
                user.save()
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                # Rediriger vers le frontend avec le token dans l'URL ou via un cookie
                response = redirect(
                    f"https://transcendence.fr/login/42?token={access_token}"
                )
                cookie_max_age = 3600 * 24 * 14  # 14 jours
                response.set_cookie(
                    "refresh_token",
                    str(refresh),
                    max_age=cookie_max_age,
                    httponly=True,
                )
                user.is_online = True
                user.save()
                return response
            else:
                return JsonResponse({"error": "Unable to fetch user info"}, status=400)
        else:
            return JsonResponse({"error": "Failed to obtain access token"}, status=400)


class Fetch42UserInfoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        access_token = request.GET.get("token")
        if not access_token:
            return JsonResponse({"error": "Token is missing"}, status=400)
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            response = requests.get("https://api.intra.42.fr/v2/me", headers=headers)
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            return JsonResponse(
                {"error": "Failed to fetch user info from 42 API"},
                status=response.status_code,
            )
        user_data = response.json()
        return JsonResponse(
            {
                "image_url": user_data.get("image_url"),
            }
        )
