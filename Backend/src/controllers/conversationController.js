const prisma = require("../config/db");
const {
  ConversationAccessError,
  conversationRoom,
  getConversationForUser,
  getDirectMessageForUser
} = require("../services/conversationAccess");

const userSelection = {
  id: true,
  name: true,
  username: true
};

const conversationInclude = {
  members: {
    include: {
      user: {
        select: userSelection
      }
    }
  },
  messages: {
    take: 1,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      user: {
        select: userSelection
      }
    }
  }
};

const openConversation = async (req, res) => {
  try {
    const username = typeof req.body?.username === "string"
      ? req.body.username.trim()
      : "";
    const email = typeof req.body?.email === "string"
      ? req.body.email.trim()
      : "";
    const identifier = username || email;

    if (!identifier) {
      return res.status(400).json({
        message: "Username or email is required"
      });
    }

    const otherUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier }
        ]
      },
      select: {
        id: true
      }
    });

    if (!otherUser) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (otherUser.id === req.user.userId) {
      return res.status(400).json({
        message: "You cannot start a conversation with yourself"
      });
    }

    const userOneId = Math.min(req.user.userId, otherUser.id);
    const userTwoId = Math.max(req.user.userId, otherUser.id);
    const where = {
      userOneId_userTwoId: {
        userOneId,
        userTwoId
      }
    };

    let conversation = await prisma.conversation.findUnique({
      where,
      include: conversationInclude
    });

    if (!conversation) {
      try {
        conversation = await prisma.conversation.create({
          data: {
            userOneId,
            userTwoId,
            members: {
              create: [
                { userId: userOneId },
                { userId: userTwoId }
              ]
            }
          },
          include: conversationInclude
        });
      } catch (error) {
        if (error.code !== "P2002") {
          throw error;
        }

        conversation = await prisma.conversation.findUnique({
          where,
          include: conversationInclude
        });

        if (!conversation) {
          throw error;
        }
      }
    }

    return res.status(200).json({
      conversation
    });
  } catch (error) {
    return handleError(error, res, "Open conversation error:");
  }
};

const getMyConversations = async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: req.user.userId
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      include: conversationInclude
    });

    return res.status(200).json({
      conversations
    });
  } catch (error) {
    return handleError(error, res, "Get conversations error:");
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const conversationId = parseId(req.params.conversationId);
    if (!conversationId) {
      return res.status(400).json({
        message: "Invalid conversation ID"
      });
    }

    await getConversationForUser(req.user.userId, conversationId);

    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        user: {
          select: userSelection
        }
      }
    });

    return res.status(200).json({
      messages
    });
  } catch (error) {
    return handleError(error, res, "Get conversation messages error:");
  }
};

const createDirectMessage = async (req, res) => {
  try {
    const conversationId = parseId(req.params.conversationId);
    const content = typeof req.body?.content === "string"
      ? req.body.content.trim()
      : "";

    if (!conversationId) {
      return res.status(400).json({
        message: "Invalid conversation ID"
      });
    }

    if (!content) {
      return res.status(400).json({
        message: "Message content is required"
      });
    }

    if (content.length > 5000) {
      return res.status(400).json({
        message: "Message is too long"
      });
    }

    await getConversationForUser(req.user.userId, conversationId);
    const io = getSocketServer(req);

    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.directMessage.create({
        data: {
          content,
          userId: req.user.userId,
          conversationId
        },
        include: {
          user: {
            select: userSelection
          }
        }
      });

      await tx.conversation.update({
        where: {
          id: conversationId
        },
        data: {
          updatedAt: new Date()
        }
      });

      return createdMessage;
    });

    io.to(conversationRoom(conversationId)).emit(
      "directMessageCreated",
      message
    );

    return res.status(201).json({
      message: "Direct message sent successfully",
      data: message
    });
  } catch (error) {
    return handleError(error, res, "Create direct message error:");
  }
};

const updateDirectMessage = async (req, res) => {
  try {
    const messageId = parseId(req.params.messageId);
    const content = typeof req.body?.content === "string"
      ? req.body.content.trim()
      : "";

    if (!messageId) {
      return res.status(400).json({
        message: "Invalid direct message ID"
      });
    }

    if (!content) {
      return res.status(400).json({
        message: "Message content is required"
      });
    }

    if (content.length > 5000) {
      return res.status(400).json({
        message: "Message is too long"
      });
    }

    const { message, conversation } = await getDirectMessageForUser(
      req.user.userId,
      messageId
    );

    if (message.userId !== req.user.userId) {
      return res.status(403).json({
        message: "You can only edit your own direct messages"
      });
    }

    const io = getSocketServer(req);
    const updatedMessage = await prisma.$transaction(async (tx) => {
      const updated = await tx.directMessage.update({
        where: {
          id: messageId
        },
        data: {
          content
        },
        include: {
          user: {
            select: userSelection
          }
        }
      });

      await tx.conversation.update({
        where: {
          id: conversation.id
        },
        data: {
          updatedAt: new Date()
        }
      });

      return updated;
    });

    io.to(conversationRoom(conversation.id)).emit(
      "directMessageUpdated",
      updatedMessage
    );

    return res.status(200).json({
      message: "Direct message updated successfully",
      data: updatedMessage
    });
  } catch (error) {
    return handleError(error, res, "Update direct message error:");
  }
};

const deleteDirectMessage = async (req, res) => {
  try {
    const messageId = parseId(req.params.messageId);
    if (!messageId) {
      return res.status(400).json({
        message: "Invalid direct message ID"
      });
    }

    const { message, conversation } = await getDirectMessageForUser(
      req.user.userId,
      messageId
    );

    if (message.userId !== req.user.userId) {
      return res.status(403).json({
        message: "You can only delete your own direct messages"
      });
    }

    const io = getSocketServer(req);
    await prisma.$transaction(async (tx) => {
      await tx.directMessage.delete({
        where: {
          id: messageId
        }
      });

      await tx.conversation.update({
        where: {
          id: conversation.id
        },
        data: {
          updatedAt: new Date()
        }
      });
    });

    io.to(conversationRoom(conversation.id)).emit("directMessageDeleted", {
      messageId,
      conversationId: conversation.id
    });

    return res.status(200).json({
      message: "Direct message deleted successfully"
    });
  } catch (error) {
    return handleError(error, res, "Delete direct message error:");
  }
};

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getSocketServer(req) {
  const io = req.app.get("io");
  if (!io) {
    throw new Error("Socket.IO server is not initialized");
  }
  return io;
}

function handleError(error, res, label) {
  if (error instanceof ConversationAccessError) {
    return res.status(error.status).json({
      message: error.message
    });
  }

  console.error(label, error);
  return res.status(500).json({
    message: "Internal server error"
  });
}

module.exports = {
  openConversation,
  getMyConversations,
  getConversationMessages,
  createDirectMessage,
  updateDirectMessage,
  deleteDirectMessage
};
