const express = require("express");

const checkAuthentication = require("../middleware/auth.middleware");

const {
  checkWorkspaceMembership,
  checkWorkspaceRole
} = require("../middleware/workspaceMiddleware");

const {
  checkChannelMembership
} = require("../middleware/channelMiddleware");

const {
  createChannel,
  getWorkspaceChannels,
  getChannel,
  renameChannel,
  deleteChannel
} = require("../controllers/channelController");

const router = express.Router();

router.post(
  "/workspaces/:workspaceId/channels",
  checkAuthentication,
  checkWorkspaceMembership,
  checkWorkspaceRole("OWNER"),
  createChannel
);

router.get(
  "/workspaces/:workspaceId/channels",
  checkAuthentication,
  checkWorkspaceMembership,
  getWorkspaceChannels
);

router.get(
  "/channels/:channelId",
  checkAuthentication,
  checkChannelMembership,
  getChannel
);

router.patch(
  "/channels/:channelId",
  checkAuthentication,
  checkChannelMembership,
  checkWorkspaceRole("OWNER"),
  renameChannel
);

router.delete(
  "/channels/:channelId",
  checkAuthentication,
  checkChannelMembership,
  checkWorkspaceRole("OWNER"),
  deleteChannel
);

module.exports = router;