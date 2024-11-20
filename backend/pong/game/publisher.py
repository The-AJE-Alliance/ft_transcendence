import aio_pika
from django.conf import settings


async def publish_message(exchange, routing_key, message):
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
