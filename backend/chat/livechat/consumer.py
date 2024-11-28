import aio_pika
import json
import asyncio
import logging
from django.conf import settings
from .processors import process

logger = logging.getLogger(__name__)


async def process_message(message):
    async with message.process():
        logger.error(f"Received message: {message.body.decode()}")
        data = json.loads(message.body.decode())
        await asyncio.to_thread(process, data)


async def start_consumer(queue_name, exchange_name):
    connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
    channel = await connection.channel()
    exchange = await channel.declare_exchange(
        exchange_name, aio_pika.ExchangeType.TOPIC
    )
    queue = await channel.declare_queue(queue_name, durable=True)

    await queue.bind(exchange, "broadcast")
    await queue.bind(exchange, queue_name)

    await queue.consume(process_message)
    logger.error("Consumer started and waiting for messages...")
    await asyncio.Future()
