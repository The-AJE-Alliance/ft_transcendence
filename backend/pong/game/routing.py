from django.urls import re_path
from . import pongConsumer

websocket_urlpatterns = [
    re_path(r'ws/?$', pongConsumer.PongConsumer.as_asgi()),  # Route WebSocket
]
