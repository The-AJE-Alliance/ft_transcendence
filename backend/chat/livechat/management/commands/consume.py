from django.core.management.base import BaseCommand
import asyncio
from livechat.consumer import start_consumer


class Command(BaseCommand):
    help = "Starts the RabbitMQ consumer"

    def add_arguments(self, parser):
        parser.add_argument("queue_name", type=str)
        parser.add_argument("exchange_name", nargs="?", type=str, default="micro")

    def handle(self, *args, **options):
        queue_name = options["queue_name"]
        exchange_name = options["exchange_name"]
        asyncio.run(start_consumer(queue_name, exchange_name))
