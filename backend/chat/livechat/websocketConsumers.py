import json
import asyncio
import channels.exceptions
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .queueHandler import QueueHandler


class ChatConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.conversation_id = None
        self.queue_handler = None

    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
        else:
            self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
            self.queue_handler = QueueHandler(self, self.conversation_id, self.user.id)
            await self.queue_handler.start()
            await self.accept()

    async def disconnect(self, close_code):
        if self.queue_handler:
            await self.queue_handler.stop()

    async def receive(self, text_data):
        data = json.loads(text_data)
        data["sender_id"] = self.user.id
        data["conversation_id"] = self.conversation_id
        await self.queue_handler.publish_message(data)

    async def send_message(self, message):
        # Méthode utilisée par le QueueHandler pour envoyer un message au client
        await self.send(text_data=json.dumps(message))
