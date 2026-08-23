const express = require("express");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.register");
const workspaceRoutes = require("./routes/createWorkspace");
const channelRoutes = require("./routes/channelRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api", channelRoutes);
app.use("/api", messageRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Team Collaborative Platform API is running"
  });
});

module.exports = app;