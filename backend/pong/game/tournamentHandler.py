import aio_pika
import asyncio
import json
import logging


from aio_pika import ExchangeType
from django.conf import settings


logger = logging.getLogger(__name__)


class TournamentHandler:
    def __init__(self, websocket, tournament_id, user_id):
        self.websocket = websocket
        self.tournament_id = tournament_id
        self.user_id = user_id
        self.connection = None
        self.channel = None
        self.exchange = None
        self.queue = None
        self.consume_task = None

    async def start(self, data):
        await self.setup()
        self.consume_task = asyncio.create_task(self.consume_messages())
        await self.publish_to_loop(data)

    async def setup(self):
        try:
            self.connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
            self.channel = await self.connection.channel()
            self.exchange = await self.channel.declare_exchange(
                f"tournament-{self.tournament_id}",
                ExchangeType.DIRECT,
                auto_delete=True,
            )
            self.queue = await self.channel.declare_queue(auto_delete=True)
            await self.queue.bind(self.exchange, "players")
            await self.queue.bind(self.exchange, f"player-{self.user_id}")
        except Exception as e:
            logger.error(f"Exception in TournamentHandler.setup: {str(e)}")

    async def consume_messages(self):
        try:
            async with self.queue.iterator() as queue_iter:
                async for message in queue_iter:
                    async with message.process():
                        msg = message.body.decode()
                        logger.info(f"[TournamentHandler] Message received: {msg}")
                        await self.websocket.send(msg)
        except asyncio.CancelledError:
            # La tâche a été annulée, on peut sortir proprement
            pass
        except Exception as e:
            logger.error(f"Exception in consume_messages: {e}", exc_info=True)

    async def publish_to_loop(self, data):
        logger.info(
            f"TournamentHandler publishing message: {json.dumps(data, indent=4)}"
        )
        await self.exchange.publish(
            aio_pika.Message(body=json.dumps(data).encode()), routing_key="tournament"
        )

    async def dispatch(self, message):
        data = json.loads(message)
        await self.publish_to_loop(data)  # Publier au tournoi

    async def stop(self):
        if self.consume_task:
            self.consume_task.cancel()
            try:
                await self.consume_task
            except asyncio.CancelledError:
                pass
        if self.connection:
            await self.connection.close()
