const express = require("express")
const router = express.Router()

const { getAuditLogs } = require("../controllers/AuditLogController")
const { auth, requiredRoles } = require("../middlewares/authMiddleware")

router.get("/", auth, requiredRoles("Admin"), getAuditLogs)

module.exports = router
