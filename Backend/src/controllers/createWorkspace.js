const prisma = require("../config/db");


// Create a new workspace
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


// Get all workspaces of logged-in user
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


// Get one workspace
const getWorkspace = async (req, res) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: req.workspaceMembership.workspaceId
      }
    });

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found"
      });
    }

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


// Add member to workspace
const addWorkspaceMember = async (req, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const { email } = req.body;

    // Validate email
    if (!email || email.trim() === "") {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: {
        email: email.trim()
      }
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Check if user is already a member
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspaceId
        }
      }
    });

    if (existingMembership) {
      return res.status(409).json({
        message: "User is already a member of this workspace"
      });
    }

    // Create membership
    const membership = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspaceId,
        role: "MEMBER"
      }
    });

    return res.status(201).json({
      message: "Member added successfully",
      membership
    });

  } catch (error) {
    console.error("Add workspace member error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};
// Remove member from workspace
const removeWorkspaceMember = async (req, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const userId = Number(req.params.userId);

    // Validate IDs
    if (Number.isNaN(workspaceId) || Number.isNaN(userId)) {
      return res.status(400).json({
        message: "Invalid workspace ID or user ID"
      });
    }

    // Check whether the user is a member
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: userId,
          workspaceId: workspaceId
        }
      }
    });

    if (!membership) {
      return res.status(404).json({
        message: "User is not a member of this workspace"
      });
    }

    // Owner cannot be removed
    if (membership.role === "OWNER") {
      return res.status(400).json({
        message: "Workspace owner cannot be removed"
      });
    }

    // Remove membership
    await prisma.workspaceMember.delete({
      where: {
        userId_workspaceId: {
          userId: userId,
          workspaceId: workspaceId
        }
      }
    });

    return res.status(200).json({
      message: "Member removed successfully"
    });

  } catch (error) {
    console.error("Remove workspace member error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember
};