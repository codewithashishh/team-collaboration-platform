const express = require("express");
const cookieParser = require("cookie-parser");
const { isOriginAllowed } = require("./config/cors");

const authRoutes = require("./routes/auth.register");
const workspaceRoutes = require("./routes/createWorkspace");
const channelRoutes = require("./routes/channelRoutes");
const messageRoutes = require("./routes/messageRoutes");
const conversationRoutes = require("./routes/conversationRoutes");

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isOriginAllowed(origin) && origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,PUT,DELETE,OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api", channelRoutes);
app.use("/api", messageRoutes);
app.use("/api", conversationRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Team Collaborative Platform API is running"
  });
});

module.exports = app;