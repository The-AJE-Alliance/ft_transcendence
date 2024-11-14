import aio_pika
import asyncio
import json
import logging


from aio_pika import ExchangeType
from django.conf import settings


logger = logging.getLogger(__name__)


class QueueHandler:
    def __init__(self, websocket, room_id, player_id):
        self.websocket = websocket
        self.room_id = room_id
        self.player = player_id
        self.connection = None
        self.channel = None
        self.exchange = None
        self.queue = None
        self.consumer_task = None

    async def setup(self):
        self.connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange(
            f"pong-{self.room_id}", ExchangeType.DIRECT, auto_delete=True
        )
        self.queue = await self.channel.declare_queue(auto_delete=True)
        await self.queue.bind(self.exchange, "players")
        await self.queue.bind(self.exchange, f"player-{self.player}")

    async def start(self, data):
        await self.setup()

        self.consumer_task = asyncio.create_task(self.consume_loop_state())
        await self.publish_to_loop(data)

    async def consume_loop_state(self):
        try:
            async with self.queue.iterator() as iterator:
                async for message in iterator:
                    async with message.process():
                        await self.websocket.send(text_data=(message.body.decode()))
        except Exception as e:
            logger.error(f"{str(e)}")

    async def publish_to_loop(self, data):
        await self.exchange.publish(
            aio_pika.Message(body=json.dumps(data).encode()), routing_key="loop"
        )

    async def stop(self):
        if self.consumer_task:
            self.consumer_task.cancel()
        if self.connection:
            await self.connection.close()
