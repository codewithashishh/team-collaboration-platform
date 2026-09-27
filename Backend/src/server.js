const { createServer } = require("http");
const { Server } = require("socket.io");

const { port } = require("./config/env");
const app = require("./app");

const socketAuth = require("./socket/socketAuth");
const socketHandlers = require("./socket/socketHandlers");

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  }
});

// Socket authentication
io.use(socketAuth);

// Socket event handlers
socketHandlers(io);

// Start server
httpServer.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});