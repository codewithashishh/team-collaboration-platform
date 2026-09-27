const express = require("express");

const checkAuthentication = require("../middleware/auth.middleware");
const {
  openConversation,
  getMyConversations,
  getConversationMessages,
  createDirectMessage,
  updateDirectMessage,
  deleteDirectMessage
} = require("../controllers/conversationController");

const router = express.Router();

router.use(checkAuthentication);

router.post("/conversations", openConversation);
router.get("/conversations", getMyConversations);
router.get(
  "/conversations/:conversationId/messages",
  getConversationMessages
);
router.post(
  "/conversations/:conversationId/messages",
  createDirectMessage
);
router.patch("/direct-messages/:messageId", updateDirectMessage);
router.delete("/direct-messages/:messageId", deleteDirectMessage);

module.exports = router;
