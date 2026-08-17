const express = require("express")
const router = express.Router()
const{createWorkspace}= require("../controllers/createWorkspace")


router.post("/workspace", createWorkspace);


module.exports = router;