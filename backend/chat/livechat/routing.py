from django.urls import re_path
from .websocketConsumers import ChatConsumer

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<conversation_id>\w+)/$", ChatConsumer.as_asgi()),
]
