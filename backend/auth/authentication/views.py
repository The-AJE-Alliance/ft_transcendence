from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from rest_framework.decorators import api_view
from django.db.utils import IntegrityError

from .models import User
from .serializers import UserSerializer
from .permissions import IsOwner
import requests


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["update", "destroy", "partial_update", "retrieve"]:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

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
    def list_friends(self, request):
        # Obtenir l'utilisateur actuel
        user = request.user

        # Filtrer les utilisateurs qui ne sont pas encore amis
        potential_friends = User.objects.exclude(friends=user).exclude(id=user.id)

        # Retourner les utilisateurs dans la réponse
        serializer = self.get_serializer(potential_friends, many=True)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        url_path="login/42",
    )
    def login_with_42(self, request):
        code = request.data.get("code")
        if not code:
            return Response(
                {"error": "Authorization code is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Échange du code contre un token d'accès
        token_url = "https://api.intra.42.fr/oauth/token"
        client_id = "YOUR_CLIENT_ID"  # Remplacez par votre client_id
        client_secret = "YOUR_CLIENT_SECRET"  # Remplacez par votre client_secret
        redirect_uri = "YOUR_REDIRECT_URI"  # Remplacez par votre URI de redirection

        data = {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "code": code,
        }

        response = requests.post(token_url, data=data)

        if response.status_code != 200:
            return Response(response.json(), status=status.HTTP_401_UNAUTHORIZED)

        access_token = response.json().get("access_token")

        # Utiliser le token pour obtenir des informations sur l'utilisateur
        user_info_url = "https://api.intra.42.fr/v2/me"
        headers = {"Authorization": f"Bearer {access_token}"}
        user_response = requests.get(user_info_url, headers=headers)

        if user_response.status_code != 200:
            return Response(user_response.json(), status=status.HTTP_401_UNAUTHORIZED)

        user_data = user_response.json()
        username = user_data.get("login")
        email = user_data.get("email")

        # Vérifier si l'utilisateur existe dans votre base de données
        user, created = User.objects.get_or_create(
            username=username, defaults={"email": email}
        )

        # Gérer la connexion de l'utilisateur et la création de JWT
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


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
        avatar=avatar,
    )
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
    def finalize_response(self, request, response, *args, **kwargs):
        if response.status_code == 200:
            user = User.objects.get(username=request.data["username"])
            user.is_online = True  # Met à jour le statut en ligne lors de la connexion
            user.save()

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

    def post(self, request):
        try:
            user = request.user
            user.is_online = False
            user.save()

            refresh_token = request.COOKIES.get("refresh_token")
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)


# @api_view(['POST'])
# def send_mymail(request):
#     from_mail = "ponggame@mail.com"
#     user_email = request.data.get('email')
#     # verification_token = get_random_string(length=32)
#     verication_token = "true email"

#     try:
#         verification_link = f"http://localhost:8000/api/verify-email/?token={verification_token}"
#         send_mail(
#             'Pong game email checking',
#             f'Click the link to activate your account : {verification_link}',
#             from_mail,
#             [user_email],
#             fail_silently=False,
#         )
#         return Response({"message": "Send verification mail successfully !"}, status=status.HTTP_200_OK)
#     except Exception as e:
#         return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# # @api_view(['GET'])
# # def mail_verified(request):
# # 	token = request.data.get('token')
# # 	if token and token == "true email"
