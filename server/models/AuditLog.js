const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema({
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    action: {
        type: String,
        required: true,
        enum: [
            "subscription:pause",
            "subscription:resume",
            "subscription:cancel",
            "subscription:plan-change",
            "subscription:clear-past-due",
            "subscription:reactivate",
            "user:create",
            "user:update",
            "customer:note-add",
            "user:delete",
            "payment:retry",
            "invoice:resend",
            "notification:send",
            "notification:bulk-send",
            "notification:template-create",
            "notification:template-deactivate"
        ]
    },
    targetType: {
        type: String,
        required: true,
        enum: ["Subscription", "User", "Payment", "Invoice", "NotificationTemplate"],
        default: "Subscription"
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },
    ip: String,
    userAgent: String,
    status: {
        type: String,
        enum: ["success", "failure"],
        default: "success"
    },
    errorMessage: String,
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 7776000  // 90 days TTL
    }
})

// Indexes for efficient queries
auditLogSchema.index({ actorId: 1, createdAt: -1 })
auditLogSchema.index({ targetId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ targetType: 1, createdAt: -1 })

module.exports = mongoose.model("AuditLog", auditLogSchema)
