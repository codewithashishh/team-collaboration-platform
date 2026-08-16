const express = require("express");
const app = express();
app.use(express.json());
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.get("/",(req, res)=>{
   res.json({"message":"welcome To Our Chat App"})
})

module.exports = app;