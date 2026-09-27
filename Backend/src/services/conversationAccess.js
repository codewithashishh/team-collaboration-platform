const prisma = require("../config/db");

class ConversationAccessError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const conversationRoom = (conversationId) => {
  return `conversation:${conversationId}`;
};

const getConversationForUser = async (userId, conversationId) => {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId
    }
  });

  if (!conversation) {
    throw new ConversationAccessError("Conversation not found", 404);
  }

  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId
      }
    }
  });

  if (!membership) {
    throw new ConversationAccessError(
      "You are not a member of this conversation",
      403
    );
  }

  return conversation;
};

const getDirectMessageForUser = async (userId, messageId) => {
  const message = await prisma.directMessage.findUnique({
    where: {
      id: messageId
    }
  });

  if (!message) {
    throw new ConversationAccessError("Direct message not found", 404);
  }

  const conversation = await getConversationForUser(
    userId,
    message.conversationId
  );

  return {
    message,
    conversation
  };
};

module.exports = {
  ConversationAccessError,
  conversationRoom,
  getConversationForUser,
  getDirectMessageForUser
};
