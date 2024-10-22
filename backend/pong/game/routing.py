from django.urls import path
from . import pongConsumer

websocket_urlpatterns = [
    path('wss://pong.api.transcendence.local', pongConsumer.PongConsumer.as_asgi()),  # Route WebSocket
]
