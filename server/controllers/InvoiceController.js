const mongoose = require("mongoose")
const Subscription = require("../models/Subscription")
const mailSender = require("../utils/MailSender")
const { InvoiceDetailsMail } = require("../mail/templates/InvoiceDetails")
const puppeteer = require("puppeteer")

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
					subscriptionType: 1,
					startedDate: 1,
					renewalDate: 1,
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
								subscriptionType: { $cond: [{ $eq: ["$paymentStatus", "success"] }, "$subscriptionType", "$$REMOVE"] },
								startedDate: { $cond: [{ $eq: ["$paymentStatus", "success"] }, "$startedDate", "$$REMOVE"] },
								renewalDate: { $cond: [{ $eq: ["$paymentStatus", "success"] }, "$renewalDate", "$$REMOVE"] },
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
					subscriptionType: 1,
					startedDate: 1,
					renewalDate: 1,
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
					subscriptionType: { $cond: [{ $eq: ["$paymentStatus", "success"] }, "$subscriptionType", "$$REMOVE"] },
					startedDate: { $cond: [{ $eq: ["$paymentStatus", "success"] }, "$startedDate", "$$REMOVE"] },
					renewalDate: { $cond: [{ $eq: ["$paymentStatus", "success"] }, "$renewalDate", "$$REMOVE"] },
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
					subscriptionType: 1,
					startedDate: 1,
					renewalDate: 1,
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
					subscriptionType: { $cond: [{ $eq: ["$paymentStatus", "success"] }, "$subscriptionType", "$$REMOVE"] },
					startedDate: { $cond: [{ $eq: ["$paymentStatus", "success"] }, "$startedDate", "$$REMOVE"] },
					renewalDate: { $cond: [{ $eq: ["$paymentStatus", "success"] }, "$renewalDate", "$$REMOVE"] },
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

exports.downloadInvoicePdf = async (req, res) => {
	let browser
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
					subscriptionType: 1,
					startedDate: 1,
					renewalDate: 1,
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
					subscriptionType: {$cond:[{$eq:["$paymentStatus" ,"success"]},"$subscriptionType" , "$$REMOVE"]},
					startedDate: {$cond : [{$eq:["$paymentStatus","success"]},"$startedDate" , "$$REMOVE"]},
					renewalDate: {$cond : [{$eq:["$paymentStatus","success"]},"$renewalDate" , "$$REMOVE"]},
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

		const invoiceHtml = InvoiceDetailsMail(invoiceData)
		const htmlDocument = `<!doctype html><html><head><meta charset="utf-8"></head><body>${invoiceHtml}</body></html>`

		browser = await puppeteer.launch({
			args: ["--no-sandbox", "--disable-setuid-sandbox"]
		})
		const page = await browser.newPage()
		await page.setContent(htmlDocument, { waitUntil: "networkidle0" })

		const pdfBuffer = await page.pdf({
			format: "A4",
			printBackground: true
		})

		res.setHeader("Content-Type", "application/pdf")
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=invoice-${invoiceData.invoiceId}.pdf`
		)
		return res.send(pdfBuffer)
	} catch (error) {
		console.log("Error in downloadInvoicePdf....", error)
		return res.status(500).json({
			success: false,
			message: "Error occurred while downloading invoice"
		})
	} finally {
		if (browser) {
			await browser.close()
		}
	}
}



