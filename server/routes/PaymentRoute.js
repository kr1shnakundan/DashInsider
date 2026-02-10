const express = require("express")
const router = express.Router()

const { handleRazorpayWebhook, getCustomerPaymentMethod, retryPayment } = require("../controllers/PaymentController")
const {auth, requiredRoles} = require("../middlewares/authMiddleware")
router.post("/webhook",handleRazorpayWebhook)
router.get("/customers/:id/payment-methods",auth,requiredRoles("Admin"),getCustomerPaymentMethod)
router.post("/admin/payment-methods/:id/retry",auth,requiredRoles("Admin"),retryPayment)

module.exports = router