const express = require("express");

const checkAuthentication = require("../middleware/auth.middleware");

const {
  checkMessageChannelAccess,
  checkMessageAccess
} = require("../middleware/messageMiddleware");

const {
  createMessage,
  getChannelMessages,
  getMessage,
  updateMessage,
  deleteMessage
} = require("../controllers/messageController");

const router = express.Router();


router.post(
  "/channels/:channelId/messages",
  checkAuthentication,
  checkMessageChannelAccess,
  createMessage
);


router.get(
  "/channels/:channelId/messages",
  checkAuthentication,
  checkMessageChannelAccess,
  getChannelMessages
);


router.get(
  "/messages/:messageId",
  checkAuthentication,
  checkMessageAccess,
  getMessage
);


router.patch(
  "/messages/:messageId",
  checkAuthentication,
  checkMessageAccess,
  updateMessage
);


router.delete(
  "/messages/:messageId",
  checkAuthentication,
  checkMessageAccess,
  deleteMessage
);


module.exports = router;
