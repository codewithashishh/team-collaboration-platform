const express = require("express");

const checkAuthentication = require("../middleware/auth.middleware");

const {
  checkWorkspaceMembership,
  checkWorkspaceRole
} = require("../middleware/workspaceMiddleware");

const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace
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


module.exports = router;