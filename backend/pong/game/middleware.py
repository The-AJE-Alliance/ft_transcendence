from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import InvalidTokenError
from .models import PongUser


@database_sync_to_async
def get_user(validated_token):
    try:
        user_id = validated_token["user_id"]
        return PongUser.objects.get(pk=user_id)
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        query_params = dict(
            qc.split("=") for qc in query_string.split("&") if "=" in qc
        )
        token = query_params.get("token", None)

        if token is None:
            scope["user"] = AnonymousUser()
            return await super().__call__(scope, receive, send)

        try:
            validated_token = UntypedToken(token)

            user = await get_user(validated_token)
            scope["user"] = user

        except (InvalidToken, TokenError, InvalidTokenError) as e:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
