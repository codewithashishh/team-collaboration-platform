const prisma = require("../lib/prisma");

const createWorkspace = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate workspace name
    if (!name || name.trim() === "") {
      return res.status(400).json({
        message: "Workspace name is required"
      });
    }

    // User ID comes from authentication middleware
    const userId = req.user.userId;

    // Create workspace + owner membership together
    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: name.trim(),
          ownerId: userId
        }
      });

      const membership = await tx.workspaceMember.create({
        data: {
          userId: userId,
          workspaceId: workspace.id,
          role: "OWNER"
        }
      });

      return {
        workspace,
        membership
      };
    });

    return res.status(201).json({
      message: "Workspace created successfully",
      workspace: result.workspace,
      role: result.membership.role
    });
  } catch (error) {
    console.error("Create workspace error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


const getMyWorkspaces = async (req, res) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId: req.user.userId
      },
      include: {
        workspace: true
      }
    });

    // Make response cleaner
    const workspaces = memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      role: membership.role
    }));

    return res.status(200).json({
      workspaces
    });
  } catch (error) {
    console.error("Get workspaces error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


const getWorkspace = async (req, res) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: req.workspaceMembership.workspaceId
      }
    });

    return res.status(200).json({
      workspace,
      role: req.workspaceMembership.role
    });
  } catch (error) {
    console.error("Get workspace error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace
};