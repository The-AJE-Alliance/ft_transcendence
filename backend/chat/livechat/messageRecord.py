import logging
from .models import Conversation, Message

logger = logging.getLogger(__name__)


class MessageRecord:
    def __init__(self, user, conversation_id, message_content):
        self.user = user
        self.conversation = Conversation.objects.get(id=conversation_id)
        self.message_content = message_content

    async def save(self):
        try:
            Message.objects.create(
                conversation=self.conversation,
                sentFromUser=self.user,
                messageContent=self.message_content,
            )
            if self.conversation.user1 == self.user:
                self.conversation.hasUnreadMessagesByUser2 = True
            else:
                self.conversation.hasUnreadMessagesByUser1 = True
            self.conversation.save()
        except Exception as e:
            logger.error(f"{str(e)}")
