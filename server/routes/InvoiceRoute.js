const express = require("express")

const router = express.Router()

const { getAllInvoicesFromDB, getParticularInvoice, resendInvoiceEmail } = require("../controllers/InvoiceController")
const {auth,requiredRoles} = require("../middlewares/authMiddleware")

router.get("/",auth,requiredRoles("Admin"),getAllInvoicesFromDB)
router.get("/:id",auth,requiredRoles("Admin"),getParticularInvoice)
router.post("/:id/resend",auth,requiredRoles("Admin"),resendInvoiceEmail)