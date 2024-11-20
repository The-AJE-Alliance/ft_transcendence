import aio_pika
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


async def publish_message(exchange, routing_key, message):
    logger.error("publishing")
    connection = await aio_pika.connect_robust(settings.RMQ_ADDR)
    try:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(exchange, aio_pika.ExchangeType.TOPIC)
        await exchange.publish(
            aio_pika.Message(body=message.encode()), routing_key=routing_key
        )
        await channel.close()
    finally:
        await connection.close()
