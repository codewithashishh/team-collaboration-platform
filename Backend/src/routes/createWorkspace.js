const express = require("express");

const checkAuthentication = require("../middleware/auth.middleware");

const {
  checkWorkspaceMembership,
  checkWorkspaceRole
} = require("../middleware/workspaceMiddleware");

const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember
} = require("../controllers/createWorkspace");

const router = express.Router();


// Create workspace
router.post(
  "/",
  checkAuthentication,
  createWorkspace
);


// Get all workspaces of logged-in user
router.get(
  "/",
  checkAuthentication,
  getMyWorkspaces
);


// Get one workspace
router.get(
  "/:workspaceId",
  checkAuthentication,
  checkWorkspaceMembership,
  getWorkspace
);


// Add member to workspace
router.post(
  "/:workspaceId/members",
  checkAuthentication,
  checkWorkspaceMembership,
  checkWorkspaceRole("OWNER"),
  addWorkspaceMember
);


// Remove member from workspace
router.delete(
  "/:workspaceId/members/:userId",
  checkAuthentication,
  checkWorkspaceMembership,
  checkWorkspaceRole("OWNER"),
  removeWorkspaceMember
);


module.exports = router;
