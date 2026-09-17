const prisma = require("../config/db");

const checkMessageChannelAccess = async (req, res, next) => {
  try {
    const channelId = Number(req.params.channelId);

    if (Number.isNaN(channelId)) {
      return res.status(400).json({
        message: "Invalid channel ID"
      });
    }

    const channel = await prisma.channel.findUnique({
      where: {
        id: channelId
      }
    });

    if (!channel) {
      return res.status(404).json({
        message: "Channel not found"
      });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.userId,
          workspaceId: channel.workspaceId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    req.channel = channel;
    req.workspaceMembership = membership;

    next();

  } catch (error) {
    console.error("Message channel access error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

const checkMessageAccess = async (req, res, next) => {
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
        channel: true
      }
    });

    if (!message) {
      return res.status(404).json({
        message: "Message not found"
      });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.userId,
          workspaceId: message.channel.workspaceId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    req.message = message;
    req.channel = message.channel;
    req.workspaceMembership = membership;

    next();
  } catch (error) {
    console.error("Message access error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


module.exports = {
  checkMessageChannelAccess,
  checkMessageAccess
};
