const express = require("express")

const router = express.Router()

const { getAllInvoicesFromDB } = require("../controllers/InvoiceController")
const {auth,requiredRoles} = require("../middlewares/authMiddleware")

router.get("/",auth,requiredRoles("Admin"),getAllInvoicesFromDB)