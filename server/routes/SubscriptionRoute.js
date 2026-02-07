const express = require("express")
const router  = express.Router()

const {getSubscriptions, upgradeSubscriptions, createPayNowOrder} = require("../controllers/SubscriptionController")

const {auth} = require("../middlewares/authMiddleware")

router.get("/",auth , getSubscriptions)
router.post("/upgrade",auth ,upgradeSubscriptions)
router.post("/pay-now",auth ,createPayNowOrder)


module.exports = router