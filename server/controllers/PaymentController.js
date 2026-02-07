const crypto = require("crypto")
const PaymentMethod = require("../models/PaymentMethod");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Razorpay = require("razorpay");
const dayjs = require("dayjs");
const { default: mongoose } = require("mongoose");

require("dotenv").config()


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

const GRACE_DAYS = 3

const razorpayPlanIds = {
    Pro: process.env.RAZORPAY_PLAN_PRO,
    Premium: process.env.RAZORPAY_PLAN_PREMIUM
}

const markPastDue = (subscription) => {
    const now = dayjs()
    subscription.status = "Past_due"
    subscription.pastDueSince = now.toDate()
    subscription.graceUntil = now.add(GRACE_DAYS, "day").toDate()
}

const clearPastDue = (subscription) => {
    subscription.pastDueSince = undefined
    subscription.graceUntil = undefined
}

const ensureRazorpaySubscription = async (subscription, customerId) => {
    const planId = razorpayPlanIds[subscription.subscriptionType]
    const effectiveCustomerId = customerId || subscription.razorpayCustomerId

    //if plan is free
    if (!planId) {
        if (subscription.razorpaySubscriptionId) {
            try {
                await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId)
            } catch (error) {
                console.error("Failed to cancel Razorpay subscription:", error)
            }
        }
        subscription.razorpaySubscriptionId = undefined
        subscription.razorpayPlanId = undefined
        return
    }

    //Require a Razorpay customer
    if (!effectiveCustomerId) {
        console.warn("Missing Razorpay customer id. Skipping subscription creation.")
        return
    }


    //Avoid duplicate subscriptions
    if (subscription.razorpaySubscriptionId && subscription.razorpayPlanId === planId) {
        return
    }


    //Plan change scenario--> it cancels the old plan first
    if (subscription.razorpaySubscriptionId && subscription.razorpayPlanId !== planId) {
        try {
            await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId)
        } catch (error) {
            console.error("Failed to cancel Razorpay subscription before plan change:", error)
        }
    }

    //Create or update subscription
    const created = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: 120,
        customer_notify: 1,
        customer_id: effectiveCustomerId
    })

    subscription.razorpaySubscriptionId = created.id
    subscription.razorpayPlanId = planId
    subscription.razorpayCustomerId = effectiveCustomerId
}

const addPaymentHistoryEntry = (subscription, entry) => {
    subscription.paymentHistory.push({
        date: new Date(),
        amount: entry.amount,
        paymentStatus: entry.paymentStatus,
        failureReason: entry.failureReason,
        razorpayPaymentId: entry.razorpayPaymentId,
        razorpayOrderId: entry.razorpayOrderId,
        event: entry.event
    });
}

exports.handleRazorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        // 1. Signature check (Use raw body if possible, but keeping your JSON logic for now)
        const body = JSON.stringify(req.body);
        const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");
        if (signature !== expectedSignature) return res.status(400).send("Invalid Signature");

        const { event, payload } = req.body;
        const payment = payload.payment.entity;
        console.log("payment details from webhook..:",payment)

        // 2. Log Failures and update subscription
        if (event === "payment.failed") {
            console.log(`Payment Failed: ${payment.email} - ${payment.error_description}`);
            const user = await User.findOne({ email: payment.email });
            if (!user) return res.status(200).json({ success: true });

            const subscription = await Subscription.findOne({ userId: user._id });
            if (!subscription) return res.status(200).json({ success: true });

            const paidAmount = payment.amount ? payment.amount / 100 : subscription.monthlyPrice;
            const isUpgradeFailure = subscription.pendingUpgrade
                && payment.order_id
                && subscription.pendingUpgrade.razorpayOrderId === payment.order_id;

            addPaymentHistoryEntry(subscription, {
                amount: paidAmount,
                paymentStatus: "failed",
                failureReason: payment.error_description || payment.error_reason || "Payment failed",
                razorpayPaymentId: payment.id,
                razorpayOrderId: payment.order_id,
                event
            })

            if (!isUpgradeFailure) {
                markPastDue(subscription)
            }

            await subscription.save()
            return res.status(200).json({ success: true });
        }

        // 3. Handle Success Events
        const successEvents = ["order.paid", "payment.captured", "subscription.charged", "payment.authorized"];
        if (successEvents.includes(event)) {
            console.log("inside success events block..  ")
            const user = await User.findOne({ email: payment.email });
            if (!user) return res.status(400).send("User not found");

            const subscription = await Subscription.findOne({ userId: user._id });
            if (!subscription) return res.status(200).json({ success: true });

            const paidAmount = payment.amount ? payment.amount / 100 : null;
            const isUpgradePayment = subscription.pendingUpgrade
                && payment.order_id
                && subscription.pendingUpgrade.razorpayOrderId === payment.order_id;
            const expectedAmount = isUpgradePayment
                ? subscription.pendingUpgrade.expectedAmount
                : subscription.monthlyPrice;

            if (paidAmount !== null && expectedAmount !== null && paidAmount !== expectedAmount) {
                addPaymentHistoryEntry(subscription, {
                    amount: paidAmount,
                    paymentStatus: "failed",
                    failureReason: "amount_mismatch",
                    razorpayPaymentId: payment.id,
                    razorpayOrderId: payment.order_id,
                    event
                })

                if (!isUpgradePayment) {
                    markPastDue(subscription)
                }

                await subscription.save();
                return res.status(200).json({ success: true });
            }

            if (isUpgradePayment) {
                subscription.subscriptionType = subscription.pendingUpgrade.planType;
                subscription.monthlyPrice = subscription.pendingUpgrade.monthlyPrice;
                subscription.status = "Active";
                subscription.startedDate = new Date();
                subscription.renewalDate = dayjs().add(30, "day").toDate();
                subscription.cancellationDate = null;
                subscription.pendingUpgrade = undefined;
                clearPastDue(subscription)
            } else {
                subscription.status = "Active";
                subscription.renewalDate = dayjs().add(30, "day").toDate();
                clearPastDue(subscription)
            }

            addPaymentHistoryEntry(subscription, {
                amount: paidAmount !== null ? paidAmount : expectedAmount,
                paymentStatus: "success",
                failureReason: undefined,
                razorpayPaymentId: payment.id,
                razorpayOrderId: payment.order_id,
                event
            })

            if (payment.customer_id) {
                subscription.razorpayCustomerId = payment.customer_id
            }

            await ensureRazorpaySubscription(subscription, payment.customer_id)

            await subscription.save();

            // Define a unique identifier for this payment method record
            // For cards, we use card_id; for others, we use the token or the payment ID itself
            const uniqueMethodId = payment.card_id || payment.token_id || payment.id;
            if(!uniqueMethodId){
                console.warn("No unique identifier found for this payment method. Skipping database update.");
                return res.status(200).json({ success: true });
            }
            console.log("unique method id for this payment method..:",uniqueMethodId)

            const updateData = {
                userId: user._id,
                razorpayCardId: payment.card_id || null, 
                razorpayTokenId: payment.token_id || null,
                razorpayCustomerId: payment.customer_id, 
                methodType: payment.method,
                isDefault: true
            };

            console.log("update data before method specific details..:",updateData)

            // 4. Extract Method-Specific Data
            if (payment.method === "card") {
                console.log("inside the card method block..")
                let cardInfo = payment.card;
                // Fetch full details if expiry is missing
                if (!cardInfo.expiry_month || !cardInfo.expiry_year) {
                    try {
                        const fetchedCard = await razorpay.cards.fetch(payment.card_id); 
                        if(fetchedCard && fetchedCard.expiry_month && fetchedCard.expiry_year){
                            cardInfo = fetchedCard;
                        }
                        console.log("fetched card info from razorpay..:",fetchedCard)
                    } 
                    catch (err) { console.error("Card Fetch Error:", err); }
                }
                updateData.cardDetails = {
                    last4: cardInfo.last4,
                    network: cardInfo.network,
                    cardType: cardInfo.type,
                    expiryMonth: cardInfo.expiry_month || null,
                    expiryYear: cardInfo.expiry_year || null,
                    issuer: cardInfo.issuer || "Unknown"
                };

                console.log("updated data for card..:",updateData)
            } else if (payment.method === "upi") {
                updateData.upiDetails = {
                    vpa: payment.vpa 
                };
            } else if (payment.method === "netbanking") {
                updateData.bankDetails = {
                    bankName: payment.bank
                };
            }

            // 5. Update Payment Method Database
            await PaymentMethod.updateMany({ userId: user._id }, { isDefault: false });
            await PaymentMethod.findOneAndUpdate(
                { razorpayCardId: uniqueMethodId }, // Or use a compound key
                updateData,
                { upsert: true, new: true }
            );
        }

        console.log(`Webhook Processed: ${event} for ${payment.email}`);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Webhook Error:", error);
        return res.status(500).json({ success: false });
    }
};



exports.getCustomerPaymentMethod = async(req,res)=>{
    try{
        const {id} = req.params

        const user = await User.findById(id)
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const methods = await PaymentMethod.find({userId:id}).sort({isDefault:-1,createdAt:-1})

        const formattedMethods = methods.map(method=>{
            const baseInfo = {
                id:method._id,
                type:method.methodType,
                isDefault:method.isDefault,
                addedOn:method.createdAt,
                status:method.status,
            }

            if(method.methodType === "card"){
                const expM = method.cardDetails.expiryMonth
                const expY = method.cardDetails.expiryYear
                const expiryDisplay = (expM && expY) ? `${expM}/${expY}` : "Not Available"
                return {
                    ...baseInfo,
                    displayValue:`****${method.cardDetails.last4}`,
                    brand:method.cardDetails.network,
                    expiryDisplay : expiryDisplay,
                    isDataComplete: !!(expM && expY && method.cardDetails.issuer),
                    subText:`${method.cardDetails.cardType} issed by ${method.cardDetails.issuer || `Unknown`}`
                }
            } else if(method.methodType === "upi"){
                return {
                    ...baseInfo,
                    displayValue:method.upiDetails?.vpa || "UPI ID",
                    brand:"UPI",
                    expiry:"N/A",
                    subText:"Digital Wallet/VPA"
                }
            } else if(method.methodType === "netbanking"){
                return {
                    ...baseInfo,
                    displayValue:method.bankDetails?.bankName || "Bank Account",
                    brand:"NetBanking",
                    expiry:"N/A",
                    subText:"Direct Bank Transfer"
                }
            }
            return baseInfo
        })

        return res.status(200).json({
            success:true,
            customerEmail:user.email,
            results:formattedMethods.length,
            data:formattedMethods
        })
    } catch(error){
        console.error("Get Payment Methods Error:",error)
        return res.status(500).json({
            success:false,
            message:"An error occurred while fetching payment methods"
        })
    }
}


exports.deletePaymentMethod = async(req,res)=>{
    const session = await mongoose.startSession()
    session.startTransaction()
    try{
        const {id} = req.params

        const user = await User.findById(id)
        if(!user){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`user not found`
            })
        }

        const methods = await PaymentMethod.find({userId:id}).sort({createdAt:-1})
        if(!methods){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`no paymentMethod details found in database`
            })
        }

        const deletedPaymentMethods = methods.map(method=>{
            
        })

    } catch(error){
        console.log("Error in delete paymentMethod controller....",error)
    }
}