const AuditLog = require("../models/AuditLog")

// Mapping of routes to audit actions
const actionMap = {
    "POST:/api/v1/subscriptions/:id/pause": "subscription:pause",
    "POST:/api/v1/subscriptions/:id/resume": "subscription:resume",
    "POST:/api/v1/subscriptions/:id/cancel": "subscription:cancel",
    "PUT:/api/v1/subscriptions/:id/plan": "subscription:plan-change",
    "POST:/api/v1/subscriptions/:id/clear-past-due": "subscription:clear-past-due",
    "POST:/api/v1/subscriptions/:id/reactivate": "subscription:reactivate",
    "PUT:/api/v1/customers/:customerId/update": "user:update",
    "POST:/api/v1/customers/:customerId/addnote": "customer:note-add",
    "POST:/api/v1/payment/admin/payment-methods/:id/retry": "payment:retry",
    "POST:/api/v1/invoices/:id/resend": "invoice:resend",
    "POST:/api/v1/notifications/admin/notifications/send": "notification:bulk-send",
    "POST:/api/v1/notifications/admin/customers/:id/notify": "notification:send",
    "POST:/api/v1/notifications/admin/notifications/templates": "notification:template-create",
    "PATCH:/api/v1/notifications/admin/notifications/templates/:id/deactivate": "notification:template-deactivate"
}

const getActionFromRoute = (method, path) => {
    const routeKey = `${method}:${path}`
    return actionMap[routeKey] || null
}

exports.auditLog = async (req, res, next) => {
    // Store original res.json to intercept responses
    const originalJson = res.json

    res.json = function (data) {
        if (data && data.auditLogged) {
            return originalJson.call(this, data)
        }
        // Only log for admin subscription actions
        if (res.statusCode >= 200 && res.statusCode < 300 && data.success !== false) {
            logAction(req, data, false).catch(err =>
                console.log("Error logging audit action...", err)
            )
        } else if (res.statusCode >= 400) {
            // Also log failures
            logAction(req, data, true).catch(err =>
                console.log("Error logging audit action...", err)
            )
        }

        return originalJson.call(this, data)
    }

    next()
}

const logAction = async (req, responseData, isFailure = false) => {
    const action = getActionFromRoute(req.method, req.baseUrl + req.route?.path)
    
    if (!action) {
        return
    }

    try {
        const { id } = req.params
        const auditData = {
            actorId: req.user?.id,
            action,
            targetType: "Subscription",
            targetId: id,
            metadata: {
                reason: req.body?.reason || null,
                newPlan: req.body?.plan || null,
                endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`
            },
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get("user-agent"),
            status: isFailure ? "failure" : "success",
            errorMessage: isFailure ? responseData.message : null
        }

        await AuditLog.create(auditData)
    } catch (error) {
        console.log("Error creating audit log entry...", error)
    }
}
