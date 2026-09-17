const express = require("express")
const router = express.Router()
const checkAuthentication = require("../middleware/auth.middleware")
const {
  register,
  login,
  logout,
  getMe
}= require("../controllers/auth.controller")



router.post("/register", register)
router.post("/login", login)
router.post("/logout", logout)
router.get("/me", checkAuthentication, getMe)

module.exports= router;
