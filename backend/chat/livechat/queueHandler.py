import aio_pika
import asyncio
import json
import logging
from aio_pika import ExchangeType
from django.conf import settings


logger = logging.getLogger(__name__)


class QueueHandler:
    def __init__(self, websocket, conversation_id, user_id):
        self.websocket = websocket
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.connection = None
        self.channel = None
        self.exchange = None
        self.queue = None
        self.consumer_task = None

    async def setup(self):
        self.connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange(
            f"chat-messages", ExchangeType.DIRECT, auto_delete=True
        )
        self.queue = await self.channel.declare_queue(
            f"chat-{self.conversation_id}-{self.user_id}", auto_delete=True
        )
        await self.queue.bind(
            self.exchange, routing_key=f"conversation-{self.conversation_id}"
        )

    async def start(self):
        await self.setup()
        self.consumer_task = asyncio.create_task(self.consume_messages())

    async def consume_messages(self):
        try:
            async with self.queue.iterator() as iterator:
                async for message in iterator:
                    async with message.process():
                        # Send messages from the WebSocket to the client
                        await self.websocket.send(text_data=(message.body.decode()))
        except Exception as e:
            logger.error(f"Error in consume_messages : {str(e)}")

    async def publish_message(self, message_data):
        try:
            # Publish the message
            message_data["user_id"] = self.user_id
            await self.exchange.publish(
                aio_pika.Message(body=json.dumps(message_data).encode()),
                routing_key=f"conversation-{self.conversation_id}",  # Clé de routage liée à la conversation
            )
        except Exception as e:
            logger.error(f"Error in publish_message : {str(e)}")

    async def stop(self):
        if self.consumer_task:
            self.consumer_task.cancel()
        if self.connection:
            await self.channel.close()
            await self.connection.close()
