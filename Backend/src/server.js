const { createServer } = require("http");
const { Server } = require("socket.io");

const { port } = require("./config/env");
const { allowedOrigins } = require("./config/cors");
const app = require("./app");

const socketAuth = require("./socket/socketAuth");
const socketHandlers = require("./socket/socketHandlers");

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

app.set("io", io);

// Socket authentication
io.use(socketAuth);

// Socket event handlers
socketHandlers(io);

// Start server
httpServer.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});