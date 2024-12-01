import logging
from .models import Conversation, Message
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


# TODO: potentially remove this useless file
class MessageRecord:
    def __init__(self, user_id, conversation_id, message_content):
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.message_content = message_content

    async def save(self):
        try:
            await sync_to_async(Message.objects.create)(
                conversation_id=self.conversation_id,
                sentFromUser_id=self.user_id,
                messageContent=self.message_content,
            )
        except Exception as e:
            logger.error(f"{str(e)}")
