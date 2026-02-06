const express = require("express")
const router = express.Router()

const { handleRazorpayWebhook } = require("../controllers/PaymentController")
const {auth, requiredRoles} = require("../middlewares/authMiddleware")
router.post("/webhook",handleRazorpayWebhook)

module.exports = router