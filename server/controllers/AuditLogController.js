const AuditLog = require("../models/AuditLog")

exports.getAuditLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            action,
            targetType,
            actorId,
            targetId,
            status,
            startDate,
            endDate
        } = req.query

        const query = {}

        if (action) {
            query.action = action
        }

        if (targetType) {
            query.targetType = targetType
        }

        if (actorId) {
            query.actorId = actorId
        }

        if (targetId) {
            query.targetId = targetId
        }

        if (status) {
            query.status = status
        }

        if (startDate || endDate) {
            query.createdAt = {}
            if (startDate) {
                query.createdAt.$gte = new Date(startDate)
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate)
            }
        }

        const logs = await AuditLog.find(query)
            .populate({
                path: "actorId",
                select: "email firstName lastName accountType"
            })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 })

        const total = await AuditLog.countDocuments(query)

        return res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            message: "Audit logs fetched successfully"
        })
    } catch (error) {
        console.log("Error in getAuditLogs...", error)
        return res.status(500).json({
            success: false,
            message: "Unable to fetch audit logs"
        })
    }
}

exports.createAuditLog = async (data) => {
    try {
        const log = new AuditLog(data)
        await log.save()
        return log
    } catch (error) {
        console.log("Error creating audit log...", error)
    }
}
