const express = require("express");
const router = express.Router();

const { 
  notifySpecificCustomer,
  sendNotifications,
  createNotificationTemplate,
  deactivateNotificationTemplate,
  getNotificationTemplates 
} = require("../controllers/NotificationController");
const { auth } = require("../middlewares/authMiddleware");

// ============ POST /admin/notifications/templates ============
// Create a new notification template
// Body: { name, subject, body, channel?, variables?, description? }
router.post("/admin/notifications/templates", auth, createNotificationTemplate);

// ============ PATCH /admin/notifications/templates/:id/deactivate ============
// Deactivate a notification template
router.patch("/admin/notifications/templates/:id/deactivate", auth, deactivateNotificationTemplate);

// ============ GET /admin/notifications/templates ============
// Get all active notification templates
// Query params: channel?, isActive?
router.get("/admin/notifications/templates", auth, getNotificationTemplates);

// ============ POST /admin/notifications/send ============
// Send manual notification to multiple users or all users
// Body: { templateId?, subject?, body?, userIds?, channel?, metadata? }
router.post("/admin/notifications/send", auth, sendNotifications);

// ============ POST /admin/customers/:id/notify ============
// Notify a specific customer
// Body: { templateId?, subject?, body?, channel?, metadata? }
router.post("/admin/customers/:id/notify", auth, notifySpecificCustomer);

module.exports = router;
