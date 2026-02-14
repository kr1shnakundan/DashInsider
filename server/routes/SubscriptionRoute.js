const express = require("express")
const router  = express.Router()

const {getSubscriptions, 
    upgradeSubscriptions,
    createPayNowOrder,
    adminPauseSubscription,
    adminResumeSubscription, 
    adminCancelSubscription,
    adminChangePlan
} = require("../controllers/SubscriptionController")

const {auth, requiredRoles} = require("../middlewares/authMiddleware")

router.get("/",auth , getSubscriptions)
router.post("/upgrade",auth ,upgradeSubscriptions)
router.post("/pay-now",auth ,createPayNowOrder)
router.post("/:id/pause", auth, requiredRoles("Admin"), adminPauseSubscription)
router.post("/:id/resume", auth, requiredRoles("Admin"), adminResumeSubscription)
router.post("/:id/cancel", auth, requiredRoles("Admin"), adminCancelSubscription)
router.put("/:id/plan", auth, requiredRoles("Admin"), adminChangePlan)


module.exports = router