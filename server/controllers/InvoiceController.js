const mongoose = require("mongoose")
const Subscription = require("../models/Subscription")

// Admin: list invoices derived from subscription payment history.
exports.getAllInvoicesFromDB = async (req, res) => {
	try {
		const {
			status,
			userId,
			startDate,
			endDate,
			minAmount,
			maxAmount,
			page = 1,
			limit = 20,
			sort = "-date"
		} = req.query

		if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid userId"
			})
		}

		const topLevelMatch = {}
		if (userId) {
			topLevelMatch.userId = new mongoose.Types.ObjectId(userId)
		}

		const invoiceMatch = {}
		if (status) invoiceMatch.paymentStatus = status
		if (minAmount || maxAmount) {
			invoiceMatch.amount = {}
			if (minAmount) invoiceMatch.amount.$gte = Number(minAmount)
			if (maxAmount) invoiceMatch.amount.$lte = Number(maxAmount)
		}
		if (startDate || endDate) {
			invoiceMatch.date = {}
			if (startDate) invoiceMatch.date.$gte = new Date(startDate)
			if (endDate) invoiceMatch.date.$lte = new Date(endDate)
		}

		const allowedSort = { date: "date", amount: "amount" }
		const sortKey = String(sort || "-date")
		const sortDirection = sortKey.startsWith("-") ? -1 : 1
		const sortField = sortKey.replace(/^-/, "")
		const sortStage = {
			[allowedSort[sortField] || "date"]: sortDirection
		}

		const pageNumber = Math.max(1, Number(page))
		const limitNumber = Math.max(1, Number(limit))
		const skip = (pageNumber - 1) * limitNumber

		const pipeline = [
			{ $match: topLevelMatch },
			{ $unwind: "$paymentHistory" },
			{
				$project: {
					invoiceId: "$paymentHistory._id",
					subscriptionId: "$_id",
					razorpaySubscriptionId: 1,
					userId: 1,
					date: "$paymentHistory.date",
					amount: "$paymentHistory.amount",
					paymentStatus: "$paymentHistory.paymentStatus",
					failureReason: "$paymentHistory.failureReason",
					razorpayPaymentId: "$paymentHistory.razorpayPaymentId",
					razorpayOrderId: "$paymentHistory.razorpayOrderId",
					event: "$paymentHistory.event"
				}
			},
			Object.keys(invoiceMatch).length ? { $match: invoiceMatch } : null,
			{
				$facet: {
					data: [
						{ $sort: sortStage },
						{ $skip: skip },
						{ $limit: limitNumber },
						{
							$lookup: {
								from: "users",
								localField: "userId",
								foreignField: "_id",
								as: "userDetails"
							}
						},
						{
							$unwind: {
								path: "$userDetails",
								preserveNullAndEmptyArrays: true
							}
						},
						{
							$project: {
								invoiceId: 1,
								subscriptionId: 1,
								razorpaySubscriptionId: 1,
								userId: 1,
								date: 1,
								amount: 1,
								paymentStatus: 1,
								failureReason: 1,
								razorpayPaymentId: 1,
								razorpayOrderId: 1,
								event: 1,
								userDetails: {
									_id: 1,
									email: 1,
									firstName: 1,
									lastName: 1
								}
							}
						}
					],
					total: [{ $count: "count" }]
				}
			}
		].filter(Boolean)

		const result = await Subscription.aggregate(pipeline)
		const data = result[0]?.data || []
		const total = result[0]?.total?.[0]?.count || 0

		return res.status(200).json({
			success: true,
			data,
			pagination: {
				page: pageNumber,
				limit: limitNumber,
				total,
				pages: Math.ceil(total / limitNumber)
			},
			message: "Invoices fetched successfully"
		})
	} catch (error) {
		console.log("Database Invoice Fetch Error:", error)
		return res.status(500).json({
			success: false,
			message: "Internal server error while fetching invoices."
		})
	}
}
