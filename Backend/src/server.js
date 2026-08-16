const app = require("./app");
const dotenv=require("dotenv")
dotenv.config();
const authRoutes = require("./routes/auth.register")
const port = process.env.PORT|| 5000






app.use("/api/auth", authRoutes);


app.listen(port,()=>{
  console.log("Server is listening")
})