const prisma = require("../lib/prisma");


// Check whether the logged-in user belongs to the workspace
const checkWorkspaceMembership = async (req, res, next) => {
  try {
    const workspaceId = Number(req.params.workspaceId);

    if (Number.isNaN(workspaceId)) {
      return res.status(400).json({
        message: "Invalid workspace ID"
      });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.userId,
          workspaceId: workspaceId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

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