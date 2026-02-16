const cron = require('node-cron')
const Subscription = require("../models/Subscription")
const dayjs = require("dayjs")
require("dotenv").config()
const Razorpay = require("razorpay")

const GRACE_DAYS = 3

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET
})

const PricingPlan = require("../models/PricingPlan")

// Fetch Razorpay plan IDs from database
const getRazorpayPlanIdsFromDB = async () => {
    try {
        const pricingPlans = await PricingPlan.find({ isActive: true })
            .select("planType razorpayPlanId")
            .lean();
        
        const planIdsMap = {};

        pricingPlans.forEach(plan => {
            if (plan.razorpayPlanId) {
                planIdsMap[plan.planType] = plan.razorpayPlanId;
            }
        });

        return planIdsMap;
    } catch (error) {
        console.error("Error fetching Razorpay plan IDs from DB:", error);
        return {};
    }
};

const syncRazorpaySubscription = async (subscription, planType) => {
    const planIds = await getRazorpayPlanIdsFromDB();
    const planId = planIds[planType]
    if (!planId) {
        if (subscription.razorpaySubscriptionId) {
            try {
                await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId)
            } catch (error) {
                console.error("Failed to cancel Razorpay subscription during downgrade:", error)
            }
        }
        subscription.razorpaySubscriptionId = undefined
        subscription.razorpayPlanId = undefined
        return true
    }

    if (!subscription.razorpayCustomerId) {
        console.warn(`Missing Razorpay customer id for ${subscription._id}. Subscription not updated.`)
        return false
    }

    if (subscription.razorpaySubscriptionId && subscription.razorpayPlanId === planId) {
        return true
    }

    if (subscription.razorpaySubscriptionId && subscription.razorpayPlanId !== planId) {
        try {
            await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId)
        } catch (error) {
            console.error("Failed to cancel Razorpay subscription before plan switch:", error)
        }
    }

    const created = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: 120,
        customer_notify: 1,
        customer_id: subscription.razorpayCustomerId
    })

    subscription.razorpaySubscriptionId = created.id
    subscription.razorpayPlanId = planId
    return true
}

//============================================This job runs daily at midnight to process pending downgrades============================================//
//=========================================== However,i have not checked it in action yet============================================//
cron.schedule("0 0 * * *",async()=>{
    console.log("checking for pending downgrades...")

    try{
       const subscriptions = await Subscription.find({
        "pendingDowngrade.effectiveDate":{
            $lte:new Date()
        },
        status:"Active"
       }) 

       for (const sub of subscriptions){
        if (!sub.pendingDowngrade) {
            continue
        }

        // Guard against reapplying the same downgrade
        if (sub.subscriptionType === sub.pendingDowngrade.planType
            && sub.monthlyPrice === sub.pendingDowngrade.monthlyPrice) {
            console.log(`Skipping downgrade for ${sub._id}: already on ${sub.subscriptionType}`)
            sub.pendingDowngrade = undefined
            await sub.save()
            continue
        }

        // Store pending downgrade data before clearing it
        const newPlanType = sub.pendingDowngrade.planType
        const newMonthlyPrice = sub.pendingDowngrade.monthlyPrice


        sub.subscriptionType = newPlanType
        sub.monthlyPrice = newMonthlyPrice
        sub.startedDate = new Date()
        sub.renewalDate = dayjs().add(30,"day").toDate()

        if(newPlanType !== "Free"){
            sub.paymentHistory.push({
                date: new Date(),
                amount:newMonthlyPrice,
                paymentStatus:"success",
                failureReason:undefined
            })
        }

        sub.pendingDowngrade = undefined

        let syncSucceeded = true
        try {
            syncSucceeded = await syncRazorpaySubscription(sub, newPlanType)
        } catch (error) {
            syncSucceeded = false
            console.error("Error syncing Razorpay subscription during downgrade:", error)
        }

        if (!syncSucceeded && newPlanType !== "Free") {
            const now = dayjs()
            sub.status = "Past_due"
            sub.pastDueSince = now.toDate()
            sub.graceUntil = now.add(GRACE_DAYS, "day").toDate()
            sub.paymentHistory.push({
                date: new Date(),
                amount: newMonthlyPrice,
                paymentStatus: "failed",
                failureReason: "autopay_setup_failed",
                event: "autopay_setup_failed"
            })
        }

        await sub.save()
        console.log(`Applied downgrade for ${sub._id}: ${newPlanType}`)
       }
    } catch(error){
        console.log("Error in processing downgrades...",error)
    }
})