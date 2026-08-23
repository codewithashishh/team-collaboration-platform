const prisma = require("../config/db");

const createMessage = async (req, res) => {
  try {
    const channelId = Number(req.params.channelId);
    const { content } = req.body;

    if (Number.isNaN(channelId)) {
      return res.status(400).json({
        message: "Invalid channel ID"
      });
    }

    if (!content || content.trim() === "") {
      return res.status(400).json({
        message: "Message content is required"
      });
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        userId: req.user.userId,
        channelId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });

    return res.status(201).json({
      message: "Message sent successfully",
      data: message
    });

  } catch (error) {
    console.error("Create message error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


const getChannelMessages = async (req, res) => {
  try {
    const channelId = Number(req.params.channelId);

    if (Number.isNaN(channelId)) {
      return res.status(400).json({
        message: "Invalid channel ID"
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });

    return res.status(200).json({
      messages
    });

  } catch (error) {
    console.error("Get channel messages error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


const getMessage = async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);

    if (Number.isNaN(messageId)) {
      return res.status(400).json({
        message: "Invalid message ID"
      });
    }

    const message = await prisma.message.findUnique({
      where: {
        id: messageId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        channel: true
      }
    });

    if (!message) {
      return res.status(404).json({
        message: "Message not found"
      });
    }

    return res.status(200).json({
      message
    });

  } catch (error) {
    console.error("Get message error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


const updateMessage = async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const { content } = req.body;

    if (Number.isNaN(messageId)) {
      return res.status(400).json({
        message: "Invalid message ID"
      });
    }

    if (!content || content.trim() === "") {
      return res.status(400).json({
        message: "Message content is required"
      });
    }

    const message = await prisma.message.findUnique({
      where: {
        id: messageId
      }
    });

    if (!message) {
      return res.status(404).json({
        message: "Message not found"
      });
    }

    if (message.userId !== req.user.userId) {
      return res.status(403).json({
        message: "You can only edit your own messages"
      });
    }

    const updatedMessage = await prisma.message.update({
      where: {
        id: messageId
      },
      data: {
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });

    return res.status(200).json({
      message: "Message updated successfully",
      data: updatedMessage
    });

  } catch (error) {
    console.error("Update message error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


const deleteMessage = async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);

    if (Number.isNaN(messageId)) {
      return res.status(400).json({
        message: "Invalid message ID"
      });
    }

    const message = await prisma.message.findUnique({
      where: {
        id: messageId
      }
    });

    if (!message) {
      return res.status(404).json({
        message: "Message not found"
      });
    }

    if (message.userId !== req.user.userId) {
      return res.status(403).json({
        message: "You can only delete your own messages"
      });
    }

    await prisma.message.delete({
      where: {
        id: messageId
      }
    });

    return res.status(200).json({
      message: "Message deleted successfully"
    });

  } catch (error) {
    console.error("Delete message error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


module.exports = {
  createMessage,
  getChannelMessages,
  getMessage,
  updateMessage,
  deleteMessage
};