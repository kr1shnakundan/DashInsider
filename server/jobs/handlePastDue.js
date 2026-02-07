const cron = require("node-cron")
const dayjs = require("dayjs")
const Razorpay = require("razorpay")
const Subscription = require("../models/Subscription")

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET
})

cron.schedule("0 0 * * *", async () => {
    console.log("processing past-due subscriptions...")

    try {
        const now = new Date()
        const subscriptions = await Subscription.find({
            status: "Past_due",
            graceUntil: { $lte: now }
        })

        for (const sub of subscriptions) {
            if (!sub.graceUntil || sub.graceUntil > now) {
                continue
            }

            if (sub.razorpaySubscriptionId) {
                try {
                    await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId)
                } catch (error) {
                    console.error("Failed to cancel Razorpay subscription for past-due:", error)
                }
            }

            sub.subscriptionType = "Free"
            sub.monthlyPrice = 0
            sub.status = "Active"
            sub.startedDate = new Date()
            sub.renewalDate = dayjs().add(30, "day").toDate()
            sub.pendingDowngrade = undefined
            sub.pendingUpgrade = undefined
            sub.pastDueSince = undefined
            sub.graceUntil = undefined
            sub.razorpaySubscriptionId = undefined
            sub.razorpayPlanId = undefined

            sub.paymentHistory.push({
                date: new Date(),
                amount: 0,
                paymentStatus: "failed",
                failureReason: "grace_expired",
                event: "grace_expired"
            })

            await sub.save()
            console.log(`Downgraded past-due subscription ${sub._id} to Free`)
        }
    } catch (error) {
        console.error("Error processing past-due subscriptions...", error)
    }
})
