from django.urls import re_path
from . import websocketListener

websocket_urlpatterns = [
    re_path(r"ws/?$", websocketListener.WebsocketListener.as_asgi()),  # Route WebSocket
]
