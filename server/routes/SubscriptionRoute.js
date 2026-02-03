const express = require("express")
const router  = express.Router()

const {getSubscriptions, upgradeSubscriptions} = require("../controllers/SubscriptionController")

const {auth} = require("../middlewares/authMiddleware")

router.get("/",auth , getSubscriptions)
router.post("/upgrade",auth ,upgradeSubscriptions)


module.exports = router