import aio_pika
import asyncio
import json
import logging


from aio_pika import ExchangeType
from django.conf import settings


logger = logging.getLogger(__name__)


class TournamentHandler:
    def __init__(self, websocket, tournament_id, player_num):
        self.websocket = websocket
        self.tournament_id = tournament_id
        self.player_num = player_num
        self.connection = None
        self.channel = None
        self.exchange = None
        self.queue = None

    async def start(self, data):
        await self.setup()
        asyncio.create_task(self.consume_messages())
        await self.publish_to_loop(data)

    async def setup(self):
        try:
            self.connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
            self.channel = await self.connection.channel()
            self.exchange = await self.channel.declare_exchange(
                f"tournament-{self.tournament_id}",
                ExchangeType.DIRECT,
                auto_delete=False,
            )
            self.queue = await self.channel.declare_queue(
                name=f"tournament-{self.tournament_id}-player-{self.player_num}",
                auto_delete=False,
            )
            await self.queue.bind(self.exchange, routing_key="players")
        except Exception as e:
            logger.error(f"Exception in TournamentHandler.setup: {str(e)}")

    async def consume_messages(self):
        async with self.queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    msg = message.body.decode()
                    logger.info(f"[TournamentHandler] Message received: {msg}")
                    await self.websocket.send(msg)

    async def publish_to_loop(self, data):
        logger.info(
            f"TournamentHandler publishing message: {json.dumps(data, indent=4)}"
        )
        await self.exchange.publish(
            aio_pika.Message(body=json.dumps(data).encode()), routing_key="tournament"
        )

    async def stop(self):
        if self.connection:
            await self.connection.close()
