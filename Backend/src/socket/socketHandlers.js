const prisma = require("../config/db");
const { getChannelForUser } = require("./socketAuthorization");
const {
  conversationRoom,
  getConversationForUser,
  getDirectMessageForUser
} = require("../services/conversationAccess");

const channelRoom = (channelId) => {
  return `channel:${channelId}`;
};

const socketHandlers = (io) => {
  // Track number of active sockets per user.
  // This handles multiple browser tabs reasonably.
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    const userId = socket.user.userId;

    console.log(
      `Socket connected: ${socket.id} | User: ${userId}`
    );

    // ------------------------------------------------
    // ONLINE PRESENCE
    // ------------------------------------------------

    const currentConnections = onlineUsers.get(userId) || 0;

    onlineUsers.set(userId, currentConnections + 1);

    if (currentConnections === 0) {
      io.emit("userOnline", {
        userId,
        username: socket.user.username
      });
    }

    // ------------------------------------------------
    // JOIN CHANNEL
    // ------------------------------------------------

    socket.on("joinChannel", async (data, callback) => {
      try {
        const channelId = Number(data?.channelId);

        if (Number.isNaN(channelId)) {
          throw new Error("Invalid channel ID");
        }

        await getChannelForUser(userId, channelId);

        const room = channelRoom(channelId);

        socket.join(room);

        console.log(
          `User ${userId} joined ${room}`
        );

        socket.to(room).emit("userJoinedChannel", {
          userId,
          username: socket.user.username,
          channelId
        });

        if (callback) {
          callback({
            success: true,
            channelId
          });
        }
      } catch (error) {
        console.error("joinChannel error:", error.message);

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // LEAVE CHANNEL
    // ------------------------------------------------

    socket.on("leaveChannel", async (data, callback) => {
      try {
        const channelId = Number(data?.channelId);

        if (Number.isNaN(channelId)) {
          throw new Error("Invalid channel ID");
        }

        const room = channelRoom(channelId);

        socket.leave(room);

        console.log(
          `User ${userId} left ${room}`
        );

        socket.to(room).emit("userLeftChannel", {
          userId,
          username: socket.user.username,
          channelId
        });

        if (callback) {
          callback({
            success: true
          });
        }
      } catch (error) {
        console.error("leaveChannel error:", error.message);

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // SEND MESSAGE
    // ------------------------------------------------

    socket.on("sendMessage", async (data, callback) => {
      try {
        const channelId = Number(data?.channelId);
        const content = data?.content?.trim();

        if (Number.isNaN(channelId)) {
          throw new Error("Invalid channel ID");
        }

        if (!content) {
          throw new Error("Message content is required");
        }

        if (content.length > 5000) {
          throw new Error("Message is too long");
        }

        // Check channel membership
        await getChannelForUser(userId, channelId);

        const room = channelRoom(channelId);

        // Make sure user joined this channel room
        if (!socket.rooms.has(room)) {
          throw new Error(
            "You must join the channel before sending messages"
          );
        }

        // Save message to PostgreSQL
        const message = await prisma.message.create({
          data: {
            content,
            userId,
            channelId
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        });

        // Send message to everyone in channel
        io.to(room).emit("messageCreated", message);

        console.log(
          `Message ${message.id} created in channel ${channelId}`
        );

        if (callback) {
          callback({
            success: true,
            message
          });
        }
      } catch (error) {
        console.error(
          "sendMessage error:",
          error.message
        );

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // EDIT MESSAGE
    // ------------------------------------------------

    socket.on("editMessage", async (data, callback) => {
      try {
        const messageId = Number(data?.messageId);
        const content = data?.content?.trim();

        if (Number.isNaN(messageId)) {
          throw new Error("Invalid message ID");
        }

        if (!content) {
          throw new Error("Message content is required");
        }

        const message = await prisma.message.findUnique({
          where: {
            id: messageId
          }
        });

        if (!message) {
          throw new Error("Message not found");
        }

        // Only message owner can edit
        if (message.userId !== userId) {
          throw new Error(
            "You can only edit your own messages"
          );
        }

        // Verify channel access
        await getChannelForUser(
          userId,
          message.channelId
        );

        const updatedMessage =
          await prisma.message.update({
            where: {
              id: messageId
            },
            data: {
              content
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true
                }
              }
            }
          });

        const room = channelRoom(message.channelId);

        io.to(room).emit(
          "messageUpdated",
          updatedMessage
        );

        if (callback) {
          callback({
            success: true,
            message: updatedMessage
          });
        }
      } catch (error) {
        console.error(
          "editMessage error:",
          error.message
        );

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // DELETE MESSAGE
    // ------------------------------------------------

    socket.on("deleteMessage", async (data, callback) => {
      try {
        const messageId = Number(data?.messageId);

        if (Number.isNaN(messageId)) {
          throw new Error("Invalid message ID");
        }

        const message = await prisma.message.findUnique({
          where: {
            id: messageId
          }
        });

        if (!message) {
          throw new Error("Message not found");
        }

        if (message.userId !== userId) {
          throw new Error(
            "You can only delete your own messages"
          );
        }

        await getChannelForUser(
          userId,
          message.channelId
        );

        await prisma.message.delete({
          where: {
            id: messageId
          }
        });

        const room = channelRoom(message.channelId);

        io.to(room).emit("messageDeleted", {
          messageId,
          channelId: message.channelId
        });

        if (callback) {
          callback({
            success: true,
            messageId
          });
        }
      } catch (error) {
        console.error(
          "deleteMessage error:",
          error.message
        );

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // JOIN CONVERSATION
    // ------------------------------------------------

    socket.on("joinConversation", async (data, callback) => {
      try {
        const conversationId = parsePositiveInteger(data?.conversationId);

        if (!conversationId) {
          throw new Error("Invalid conversation ID");
        }

        await getConversationForUser(userId, conversationId);
        const room = conversationRoom(conversationId);
        socket.join(room);

        if (callback) {
          callback({
            success: true,
            conversationId
          });
        }
      } catch (error) {
        console.error("joinConversation error:", error.message);

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // LEAVE CONVERSATION
    // ------------------------------------------------

    socket.on("leaveConversation", async (data, callback) => {
      try {
        const conversationId = parsePositiveInteger(data?.conversationId);

        if (!conversationId) {
          throw new Error("Invalid conversation ID");
        }

        await getConversationForUser(userId, conversationId);
        socket.leave(conversationRoom(conversationId));

        if (callback) {
          callback({
            success: true,
            conversationId
          });
        }
      } catch (error) {
        console.error("leaveConversation error:", error.message);

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // SEND DIRECT MESSAGE
    // ------------------------------------------------

    socket.on("sendDirectMessage", async (data, callback) => {
      try {
        const conversationId = parsePositiveInteger(data?.conversationId);
        const content = typeof data?.content === "string"
          ? data.content.trim()
          : "";

        if (!conversationId) {
          throw new Error("Invalid conversation ID");
        }

        if (!content) {
          throw new Error("Message content is required");
        }

        if (content.length > 5000) {
          throw new Error("Message is too long");
        }

        await getConversationForUser(userId, conversationId);
        const room = conversationRoom(conversationId);

        if (!socket.rooms.has(room)) {
          throw new Error(
            "You must join the conversation before sending messages"
          );
        }

        const message = await prisma.$transaction(async (tx) => {
          const createdMessage = await tx.directMessage.create({
            data: {
              content,
              userId,
              conversationId
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true
                }
              }
            }
          });

          await tx.conversation.update({
            where: {
              id: conversationId
            },
            data: {
              updatedAt: new Date()
            }
          });

          return createdMessage;
        });

        io.to(room).emit("directMessageCreated", message);

        if (callback) {
          callback({
            success: true,
            message
          });
        }
      } catch (error) {
        console.error("sendDirectMessage error:", error.message);

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // EDIT DIRECT MESSAGE
    // ------------------------------------------------

    socket.on("editDirectMessage", async (data, callback) => {
      try {
        const messageId = parsePositiveInteger(data?.messageId);
        const content = typeof data?.content === "string"
          ? data.content.trim()
          : "";

        if (!messageId) {
          throw new Error("Invalid direct message ID");
        }

        if (!content) {
          throw new Error("Message content is required");
        }

        if (content.length > 5000) {
          throw new Error("Message is too long");
        }

        const { message, conversation } = await getDirectMessageForUser(
          userId,
          messageId
        );

        if (message.userId !== userId) {
          throw new Error("You can only edit your own direct messages");
        }

        const room = conversationRoom(conversation.id);
        if (!socket.rooms.has(room)) {
          throw new Error("You must join the conversation first");
        }

        const updatedMessage = await prisma.$transaction(async (tx) => {
          const updated = await tx.directMessage.update({
            where: {
              id: messageId
            },
            data: {
              content
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true
                }
              }
            }
          });

          await tx.conversation.update({
            where: {
              id: conversation.id
            },
            data: {
              updatedAt: new Date()
            }
          });

          return updated;
        });

        io.to(room).emit("directMessageUpdated", updatedMessage);

        if (callback) {
          callback({
            success: true,
            message: updatedMessage
          });
        }
      } catch (error) {
        console.error("editDirectMessage error:", error.message);

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // DELETE DIRECT MESSAGE
    // ------------------------------------------------

    socket.on("deleteDirectMessage", async (data, callback) => {
      try {
        const messageId = parsePositiveInteger(data?.messageId);

        if (!messageId) {
          throw new Error("Invalid direct message ID");
        }

        const { message, conversation } = await getDirectMessageForUser(
          userId,
          messageId
        );

        if (message.userId !== userId) {
          throw new Error("You can only delete your own direct messages");
        }

        const room = conversationRoom(conversation.id);
        if (!socket.rooms.has(room)) {
          throw new Error("You must join the conversation first");
        }

        await prisma.$transaction(async (tx) => {
          await tx.directMessage.delete({
            where: {
              id: messageId
            }
          });

          await tx.conversation.update({
            where: {
              id: conversation.id
            },
            data: {
              updatedAt: new Date()
            }
          });
        });

        io.to(room).emit("directMessageDeleted", {
          messageId,
          conversationId: conversation.id
        });

        if (callback) {
          callback({
            success: true,
            messageId,
            conversationId: conversation.id
          });
        }
      } catch (error) {
        console.error("deleteDirectMessage error:", error.message);

        if (callback) {
          callback({
            success: false,
            message: error.message
          });
        }
      }
    });

    // ------------------------------------------------
    // TYPING
    // ------------------------------------------------

    socket.on("typing", async (data) => {
      try {
        const channelId = Number(data?.channelId);

        if (Number.isNaN(channelId)) {
          return;
        }

        const room = channelRoom(channelId);

        if (!socket.rooms.has(room)) {
          return;
        }

        socket.to(room).emit("userTyping", {
          userId,
          username: socket.user.username,
          channelId
        });
      } catch (error) {
        console.error("typing error:", error.message);
      }
    });

    // ------------------------------------------------
    // STOP TYPING
    // ------------------------------------------------

    socket.on("stopTyping", async (data) => {
      try {
        const channelId = Number(data?.channelId);

        if (Number.isNaN(channelId)) {
          return;
        }

        const room = channelRoom(channelId);

        if (!socket.rooms.has(room)) {
          return;
        }

        socket.to(room).emit("userStoppedTyping", {
          userId,
          username: socket.user.username,
          channelId
        });
      } catch (error) {
        console.error(
          "stopTyping error:",
          error.message
        );
      }
    });

    // ------------------------------------------------
    // DISCONNECT
    // ------------------------------------------------

    socket.on("disconnect", () => {
      console.log(
        `Socket disconnected: ${socket.id} | User: ${userId}`
      );

      const connections =
        onlineUsers.get(userId) || 0;

      if (connections <= 1) {
        onlineUsers.delete(userId);

        io.emit("userOffline", {
          userId,
          username: socket.user.username
        });
      } else {
        onlineUsers.set(
          userId,
          connections - 1
        );
      }
    });
  });
};

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

module.exports = socketHandlers;