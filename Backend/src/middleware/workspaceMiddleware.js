const prisma = require("../lib/prisma");


// Check whether the logged-in user belongs to the workspace
const checkWorkspaceMembership = async (req, res, next) => {
  try {
    const workspaceId = Number(req.params.workspaceId);

    // Validate workspace ID
    if (Number.isNaN(workspaceId)) {
      return res.status(400).json({
        message: "Invalid workspace ID"
      });
    }

    // Find membership of current user in this workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.userId,
          workspaceId: workspaceId
        }
      }
    });

    // User is not a member
    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    // Store membership data for next middleware/controller
    req.workspaceMembership = membership;

    next();
  } catch (error) {
    console.error("Workspace membership error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


// Check whether user's role is allowed
const checkWorkspaceRole = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.workspaceMembership.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action"
      });
    }

    next();
  };
};


module.exports = {
  checkWorkspaceMembership,
  checkWorkspaceRole
};