const express = require("express")
const router = express.Router()

const { handleRazorpayWebhook, getCustomerPaymentMethod } = require("../controllers/PaymentController")
const {auth, requiredRoles} = require("../middlewares/authMiddleware")
router.post("/webhook",handleRazorpayWebhook)
router.get("/customers/:id/payment-methods",auth,requiredRoles("Admin"),getCustomerPaymentMethod)

module.exports = router