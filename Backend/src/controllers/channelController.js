const prisma = require("../config/db");

const createChannel = async (req, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const { name } = req.body;

    if (Number.isNaN(workspaceId)) {
      return res.status(400).json({
        message: "Invalid workspace ID"
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        message: "Channel name is required"
      });
    }

    const existingChannel = await prisma.channel.findFirst({
      where: {
        workspaceId,
        name: name.trim()
      }
    });

    if (existingChannel) {
      return res.status(409).json({
        message: "Channel already exists"
      });
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.trim(),
        workspaceId
      }
    });

    return res.status(201).json({
      message: "Channel created successfully",
      channel
    });

  } catch (error) {
    console.error("Create channel error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

const getWorkspaceChannels = async (req, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);

    if (Number.isNaN(workspaceId)) {
      return res.status(400).json({
        message: "Invalid workspace ID"
      });
    }

    const channels = await prisma.channel.findMany({
      where: {
        workspaceId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return res.status(200).json({
      channels
    });

  } catch (error) {
    console.error("Get workspace channels error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

const getChannel = async (req, res) => {
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

    return res.status(200).json({
      channel
    });

  } catch (error) {
    console.error("Get channel error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

const deleteChannel = async (req, res) => {
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

    await prisma.channel.delete({
      where: {
        id: channelId
      }
    });

    return res.status(200).json({
      message: "Channel deleted successfully"
    });

  } catch (error) {
    console.error("Delete channel error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

module.exports = {
  createChannel,
  getWorkspaceChannels,
  getChannel,
  deleteChannel
};