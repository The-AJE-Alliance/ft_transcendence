from .models import ChatUser
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


def process(data):
    content = data["content"]
    if data["type"] == "registration":
        create_user(content["data"])
    elif data["type"] == "update_user":
        update_user(content["id"], content["data"])
    elif data["type"] == "update_friends":
        update_friends(content["id"], content["data"])
    else:
        logger.error(f"Unknown type: {data['type']}")


def create_user(data):
    data = data.copy()
    user_id = data.pop("id", None)
    friends_ids = data.pop("friends", [])

    if user_id is None:
        return

    allowed_fields = ["username", "nickname", "is_online"]

    user_data = {field: data[field] for field in allowed_fields if field in data}

    try:
        with transaction.atomic():
            user, created = ChatUser.objects.get_or_create(
                id=user_id, defaults=user_data
            )
            if not created:
                for field, value in user_data.items():
                    setattr(user, field, value)
            if friends_ids:
                friends = ChatUser.objects.filter(id__in=friends_ids)
                user.friends.set(friends)
            user.save()
            if created:
                logger.error(f"User created: {user}")
            else:
                logger.error(f"User updated: {user}")
    except Exception as e:
        logger.error(f"Error creating user: {e}")


def update_user(user_id, changed_fields):
    friends_ids = changed_fields.pop("friends", None)

    allowed_fields = ["username", "nickname", "is_online"]

    updated_fields = {
        field: changed_fields[field]
        for field in allowed_fields
        if field in changed_fields
    }

    try:
        user = ChatUser.objects.get(id=user_id)
        for field, value in updated_fields.items():
            setattr(user, field, value)
        if friends_ids is not None:
            friends = ChatUser.objects.filter(id__in=friends_ids)
            user.friends.set(friends)
        user.save()
        logger.error(f"User updated: {user}")
    except ChatUser.DoesNotExist:
        logger.error(f"User does not exist: {user_id}")
    except Exception as e:
        logger.error(f"Error updating user: {e}")


def update_friends(user_id, friends_ids):
    try:
        user = ChatUser.objects.get(id=user_id)
        friends = ChatUser.objects.filter(id__in=friends_ids)
        user.friends.set(friends)
        user.save()
        logger.error(f"User friends updated: {user}")
    except ChatUser.DoesNotExist:
        pass
    except Exception as e:
        logger.error(f"Error updating User friends: {e}")
