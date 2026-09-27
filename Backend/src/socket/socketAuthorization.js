const prisma = require("../config/db");

const getChannelForUser = async (userId, channelId) => {
  const channel = await prisma.channel.findUnique({
    where: {
      id: channelId
    }
  });

  if (!channel) {
    throw new Error("Channel not found");
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: channel.workspaceId
      }
    }
  });

  if (!membership) {
    throw new Error("You are not a member of this workspace");
  }

  return {
    channel,
    membership
  };
};

module.exports = {
  getChannelForUser
};