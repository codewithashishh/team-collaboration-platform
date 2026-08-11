const express = require("express");
const app = express();

app.use(express.json());
app.get("/",(req, res)=>{
   res.json({"message":"welcome To Our Chat App"})
})

module.exports = app;