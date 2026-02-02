const express = require("express")
const router  = express.Router()

const {getSubscriptions} = require("../controllers/SubscriptionController")

const {auth} = require("../middlewares/authMiddleware")

router.get("/",auth , getSubscriptions)


module.exports = router