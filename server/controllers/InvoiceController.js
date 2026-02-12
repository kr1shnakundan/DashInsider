const mongoose = require("mongoose")
const Subscription = require("../models/Subscription")
const mailSender = require("../utils/MailSender")
const { InvoiceDetailsMail } = require("../mail/templates/InvoiceDetails")

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


exports.getParticularInvoice = async (req, res) => {
	try {
		const { id } = req.params

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				success: false,
				message: "Invalid invoice id"
			})
		}

		const invoiceObjectId = new mongoose.Types.ObjectId(id)

		const pipeline = [
			{ $match: { "paymentHistory._id": invoiceObjectId } },
			{ $unwind: "$paymentHistory" },
			{ $match: { "paymentHistory._id": invoiceObjectId } },
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
		]

		const result = await Subscription.aggregate(pipeline)
		const data = result[0] || null
		const email = result[0]?.userDetails?.email

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Invoice not found"
			})
		}

		return res.status(200).json({
			success: true,
			data:{
				data,
				email
			},
			message: "Invoice fetched successfully"
		})
	} catch (error) {
		console.log("Error in getParticularInvoice....", error)
		return res.status(500).json({
			success: false,
			message: "Error occurred while getting invoice for this id"
		})
	}
}





// exports.getParticularInvoiceOnEmail = async (req, res) => {
// 	try {
// 		const { email } = req.body
// 		const { id } = req.params

// 		if (!mongoose.Types.ObjectId.isValid(id)) {
// 			return res.status(400).json({
// 				success: false,
// 				message: "Invalid invoice id"
// 			})
// 		}

// 		if (!email) {
// 			return res.status(400).json({
// 				success: false,
// 				message: "Email is required"
// 			})
// 		}

// 		const invoiceObjectId = new mongoose.Types.ObjectId(id)

// 		// Fetch invoice details
// 		const pipeline = [
// 			{ $match: { "paymentHistory._id": invoiceObjectId } },
// 			{ $unwind: "$paymentHistory" },
// 			{ $match: { "paymentHistory._id": invoiceObjectId } },
// 			{
// 				$project: {
// 					invoiceId: "$paymentHistory._id",
// 					subscriptionId: "$_id",
// 					razorpaySubscriptionId: 1,
// 					userId: 1,
// 					date: "$paymentHistory.date",
// 					amount: "$paymentHistory.amount",
// 					paymentStatus: "$paymentHistory.paymentStatus",
// 					failureReason: "$paymentHistory.failureReason",
// 					razorpayPaymentId: "$paymentHistory.razorpayPaymentId",
// 					razorpayOrderId: "$paymentHistory.razorpayOrderId",
// 					event: "$paymentHistory.event"
// 				}
// 			},
// 			{
// 				$lookup: {
// 					from: "users",
// 					localField: "userId",
// 					foreignField: "_id",
// 					as: "userDetails"
// 				}
// 			},
// 			{
// 				$unwind: {
// 					path: "$userDetails",
// 					preserveNullAndEmptyArrays: true
// 				}
// 			},
// 			{
// 				$project: {
// 					invoiceId: 1,
// 					subscriptionId: 1,
// 					razorpaySubscriptionId: 1,
// 					userId: 1,
// 					date: 1,
// 					amount: 1,
// 					paymentStatus: 1,
// 					failureReason: 1,
// 					razorpayPaymentId: 1,
// 					razorpayOrderId: 1,
// 					event: 1,
// 					userDetails: {
// 						_id: 1,
// 						email: 1,
// 						firstName: 1,
// 						lastName: 1
// 					}
// 				}
// 			}
// 		]

// 		const result = await Subscription.aggregate(pipeline)
// 		const invoiceData = result[0] || null

// 		if (!invoiceData) {
// 			return res.status(404).json({
// 				success: false,
// 				message: "Invoice not found"
// 			})
// 		}

// 		// Generate invoice HTML
// 		const invoiceHTML = `
// 			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
// 				<h2 style="color: #333; margin-bottom: 20px;">Invoice Details</h2>
// 				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
// 					<tr style="border-bottom: 1px solid #ddd;">
// 						<td style="padding: 10px; font-weight: bold;">Invoice ID:</td>
// 						<td style="padding: 10px;">${invoiceData?.invoiceId}</td>
// 					</tr>
// 					<tr style="border-bottom: 1px solid #ddd;">
// 						<td style="padding: 10px; font-weight: bold;">Subscription ID:</td>
// 						<td style="padding: 10px;">${invoiceData?.subscriptionId}</td>
// 					</tr>
// 					<tr style="border-bottom: 1px solid #ddd;">
// 						<td style="padding: 10px; font-weight: bold;">Date:</td>
// 						<td style="padding: 10px;">${new Date(invoiceData?.date).toLocaleString()}</td>
// 					</tr>
// 					<tr style="border-bottom: 1px solid #ddd;">
// 						<td style="padding: 10px; font-weight: bold;">Amount:</td>
// 						<td style="padding: 10px;">₹${invoiceData?.amount.toFixed(2)}</td>
// 					</tr>
// 					<tr style="border-bottom: 1px solid #ddd;">
// 						<td style="padding: 10px; font-weight: bold;">Payment Status:</td>
// 						<td style="padding: 10px;"><span style="color: ${invoiceData?.paymentStatus === 'success' ? '#28a745' : '#dc3545'}; font-weight: bold;">${invoiceData?.paymentStatus.toUpperCase()}</span></td>
// 					</tr>
// 					${invoiceData?.failureReason ? `
// 					<tr style="border-bottom: 1px solid #ddd;">
// 						<td style="padding: 10px; font-weight: bold;">Failure Reason:</td>
// 						<td style="padding: 10px;">${invoiceData?.failureReason}</td>
// 					</tr>
// 					` : ''}
// 				</table>
// 				<p style="color: #666; margin-top: 20px; font-size: 12px;">If you have any questions about this invoice, please contact our support team.</p>
// 			</div>
// 		`

// 		// Send email
// 		const mailSent = await mailSender(email, "Invoice of the payment", invoiceHTML)

// 		if (!mailSent) {
// 			return res.status(500).json({
// 				success: false,
// 				message: "Failed to send invoice email"
// 			})
// 		}

// 		return res.status(200).json({
// 			success: true,
// 			data: {
// 				emailDetails: mailSent,
// 				invoiceDetails: invoiceData
// 			},
// 			message: "Invoice email sent successfully"
// 		})
// 	} catch (error) {
// 		console.log("Error in getParticularInvoiceOnEmail....", error)
// 		return res.status(500).json({
// 			success: false,
// 			message: "Error occurred while getting invoice for this email"
// 		})
// 	}
// }

exports.resendInvoiceEmail = async (req, res) => {
	try {
		const { id } = req.params
		const { email } = req.body

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				success: false,
				message: "Invalid invoice id"
			})
		}

		const invoiceObjectId = new mongoose.Types.ObjectId(id)

		// Fetch invoice details
		const pipeline = [
			{ $match: { "paymentHistory._id": invoiceObjectId } },
			{ $unwind: "$paymentHistory" },
			{ $match: { "paymentHistory._id": invoiceObjectId } },
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
		]

		const result = await Subscription.aggregate(pipeline)
		const invoiceData = result[0] || null

		if (!invoiceData) {
			return res.status(404).json({
				success: false,
				message: "Invoice not found"
			})
		}

		// Use provided email or fallback to user email
		const emailToSend = email || invoiceData?.userDetails?.email

		if (!emailToSend) {
			return res.status(400).json({
				success: false,
				message: "No email provided and user email not found"
			})
		}

		// Send email
		const mailSent = await mailSender(emailToSend, "Invoice from DashInsider", InvoiceDetailsMail(invoiceData))

		if (!mailSent) {
			return res.status(500).json({
				success: false,
				message: "Failed to send invoice email"
			})
		}

		return res.status(200).json({
			success: true,
			data: {
				invoiceId: invoiceData?.invoiceId,
				emailSent: emailToSend,
				sentAt: new Date()
			},
			message: "Invoice email sent successfully"
		})
	} catch (error) {
		console.log("Error in resendInvoiceEmail....", error)
		return res.status(500).json({
			success: false,
			message: "Error occurred while resending invoice email"
		})
	}
}