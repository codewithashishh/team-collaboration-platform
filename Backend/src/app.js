const express = require("express");
const app = express();
app.use(express.json());
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.get("/",(req, res)=>{
   res.json({"message":"welcome To Our Chat App"})
})
app.use("/",authMiddleware, createWorkspace)
app.use("/api/auth", authRoutes);
const workspaceRoutes = require("./routes/createWorkspace");

app.use("/api/workspaces", workspaceRoutes);

module.exports = app;