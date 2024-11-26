from asgiref.sync import async_to_sync
from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from .models import User
from .publisher import publish_message
import json
import logging

logger = logging.getLogger(__name__)


def serialize_user(instance):
    return {
        "id": instance.id,
        "username": instance.username,
        "nickname": instance.username,
        "is_online": instance.is_online,
        "friends": list(instance.friends.values_list("id", flat=True)),
    }


@receiver(post_save, sender=User)
def post_save_user(sender, instance, created, **kwargs):
    exchange = "micro"
    routing_key = "broadcast"

    try:
        if created:
            data = serialize_user(instance)
            message = {"type": "registration", "content": {"data": data}}
            async_to_sync(publish_message)(exchange, routing_key, json.dumps(message))
        else:
            changed_fields = instance.tracker.changed()
            if changed_fields:
                allowed_fields = ["id", "username", "nickname", "is_online"]
                changed_data = {
                    field: getattr(instance, field)
                    for field in changed_fields
                    if field in allowed_fields
                }
                if changed_data:
                    message = {
                        "type": "update_user",
                        "content": {
                            "id": instance.id,
                            "data": changed_data,
                        },
                    }
                    async_to_sync(publish_message)(
                        exchange, routing_key, json.dumps(message)
                    )
    except Exception as e:
        logger.error(f"Error in user model broadcast: {e}")


@receiver(m2m_changed, sender=User.friends.through)
def friends_changed(sender, instance, action, pk_set, **kwargs):
    exchange = "micro"
    routing_key = "chat"

    try:
        if action in ["post_add", "post_remove", "post_clear"]:
            friends_ids = list(instance.friends.values_list("id", flat=True))
            message = {
                "type": "update_friends",
                "content": {
                    "id": instance.id,
                    "data": friends_ids,
                },
            }
            async_to_sync(publish_message)(exchange, routing_key, json.dumps(message))
    except Exception as e:
        logger.error(f"Error in user friends model broadcast: {e}")
