const dayjs = require("dayjs")
const Subscription = require("../models/Subscription")
const User = require("../models/User")
const mongoose = require("mongoose")
const Razorpay = require("razorpay")

require("dotenv").config()

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

const pricing = {
    Free: 0,
    Pro: 499,
    Premium: 999
}

const planHierarchy = { Free: 0, Pro: 1, Premium: 2 };


exports.getSubscriptions = async(req,res)=>{
    try{
        const {page = 1,
            limit = 10,
            status,
            search
        } = req.query

        const query = {}

        if(status){
            query.status = status
        } 


        // Search by email (via populated user)
        if(search){
            const matchingUser = await User.find({  
                $or: [
                    {email:{$regex:search , $options:'i'}},
                    {firstName:{$regex:search,$options:'i'}},
                    {lastName:{$regex:search , $options:'i'}}
                ]
            }).select('_id')

            const userIds = matchingUser.map(user=>user._id)
            query.userId = {$in:userIds}
        }

        const subscriptions = await Subscription.find(query)
            .populate({
                path:"userId",
                select:"email firstName lastName"
            })
            .skip((page-1) *limit)
            .limit(Number(limit))
            .sort({startedDate:-1})

        const total = await Subscription.countDocuments(query)
        return res.status(200).json({
            success:true,
            data:subscriptions,
            pagination:{
                page:Number(page),
                limit:Number(limit),
                total,
                pages: Math.ceil(total/limit)
            },
            message:`subscriptions fetched successfully`
        })

    } catch(error){
        console.log("error in getSubscriptions..: ",error)
        return res.status(500).json({
            success:false,
            message:`unable to get Subscription`
        })
    }
}

// IN MY POINT ===> THIS CONTROLLER HAS BECOME USELESS AS DOWNGRADE HAPPENS FROM CROM
//                   AND FREE SUBSCRIPTION PLAN SHOULD BE CREATED WHEN THE USER REGISTER
//                   i.e. THIS CAN BE CALLED WHEN REGISTERING USER BY REMOVING THE DOWNGRADE OPTIONS
// Free plan activation/downgrade only; paid upgrades must use pay-now flow.
exports.upgradeSubscriptions = async(req,res)=>{
    const session = await mongoose.startSession()
    session.startTransaction()
    try{
        const {plan} = req.body;
        const userId = req.user.id;

        if(!pricing[plan]){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`Invalid Plan`
            })
        }

        if (pricing[plan] > 0) {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success: false,
                message: "Use the pay-now flow for paid plans"
            })
        }

        const existing = await Subscription.findOne({userId}).session(session)
        if (!existing) {
            const created = await Subscription.create([{
                userId,
                subscriptionType: plan,
                monthlyPrice: pricing[plan],
                status: "Active",
                startedDate: new Date(),
                renewalDate: dayjs().add(30, "day").toDate()
            }], { session })

            await session.commitTransaction()
            session.endSession()

            return res.status(200).json({
                success: true,
                subscription: created[0],
                message: `Subscription activated for ${plan}`
            })
        }

        
        if(existing && existing.status === 'Past_due'){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`Please clear the Past due first`
                // outstandingAmount:existing.monthlyPrice
            })
        }

        if(existing && existing.subscriptionType === plan && existing.status === 'Active'){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`Already active plan`
            })
        }


        //  Allow reactivation of canceled subscription
        if (existing.status === "Canceled") {
        // Reactivate the subscription
        existing.subscriptionType = plan;
        existing.monthlyPrice = pricing[plan];
        existing.status = "Active";
        existing.startedDate = new Date();
        existing.renewalDate = dayjs().add(30, "day").toDate();
        existing.cancellationDate = null;  // Clear cancellation date
        existing.pendingDowngrade = undefined;  // Clear any pending changes

        if(pricing[plan] >0){
            existing.paymentHistory.push( {
                date: new Date(),
                amount: pricing[plan],
                paymentStatus:"success",
                failureReason : undefined
            })
        }
        
        await existing.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: true,
            message: `Successfully reactivated ${plan} plan`,
            subscription: existing,
            reactivated: true
        });
        }

        // Determine if upgrade or downgrade
        const isUpgrade = !existing || planHierarchy[plan] > planHierarchy[existing.subscriptionType];
        const isDowngrade = existing && planHierarchy[plan] < planHierarchy[existing.subscriptionType];

        if(isUpgrade){
            existing.subscriptionType = plan;
            existing.monthlyPrice = pricing[plan]
            existing.status = "Active"
            existing.startedDate = new Date()
            existing.renewalDate = dayjs().add(30,"day").toDate()
            existing.cancellationDate = null
            existing.pendingDowngrade = undefined

            if(pricing[plan]>0){
                existing.paymentHistory.push({
                    date: new Date(),
                    amount:pricing[plan],
                    paymentStatus:"success",
                    failureReason:undefined
                })
            }


            await existing.save({session})

            await session.commitTransaction()
            session.endSession()

            return res.status(200).json({
                success:true,
                subscription:existing,
                message:`Subscription upgraded successfully to ${plan}`
            })  
        } else if(isDowngrade){
            // Schedule downgrade at next renewal
            existing.pendingDowngrade = {
                planType: plan,
                monthlyPrice: pricing[plan],
                effectiveDate: existing.renewalDate
            };

            await existing.save({ session });

            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({
                success: true,
                subscription: existing,
                effectiveDate: existing.renewalDate,
                message: `You will continue to have ${existing.subscriptionType} access until ${dayjs(existing.renewalDate).format('MMM D, YYYY')}`
            });
        }

    } catch(error){
        console.log("Error in upgrading Subscription...",error)
        return res.status(500).json({
            success:false,
            message:`Unable to upgrade subscription`
        })
    }
}

// Create Razorpay order for paid upgrade and store expected amount for webhook validation.
exports.createPayNowOrder = async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const { plan } = req.body;
        const userId = req.user.id;

        if (!pricing[plan]) {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success: false,
                message: "Invalid plan"
            })
        }

        if (pricing[plan] === 0) {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success: false,
                message: "Free plan does not require payment"
            })
        }

        let existing = await Subscription.findOne({ userId }).session(session)
        let wasAutoCreated = false
        if (!existing) {
            const created = await Subscription.create([{
                userId,
                subscriptionType: "Free",
                monthlyPrice: pricing.Free,
                status: "Active",
                startedDate: new Date(),
                renewalDate: dayjs().add(30, "day").toDate()
            }], { session })
            existing = created[0]
            wasAutoCreated = true
        }

        if (existing.status === "Past_due") {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success: false,
                message: "Please clear the Past due first"
            })
        }

        if (existing.subscriptionType === plan && existing.status === "Active") {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success: false,
                message: "Already active plan"
            })
        }

        const isUpgrade = planHierarchy[plan] > planHierarchy[existing.subscriptionType]
        const isDowngrade = planHierarchy[plan] < planHierarchy[existing.subscriptionType]

        if (isDowngrade) {
            existing.pendingDowngrade = {
                planType: plan,
                monthlyPrice: pricing[plan],
                effectiveDate: existing.renewalDate
            };

            await existing.save({ session })
            await session.commitTransaction()
            session.endSession()

            return res.status(200).json({
                success: true,
                subscription: existing,
                effectiveDate: existing.renewalDate,
                message: `You will continue to have ${existing.subscriptionType} access until ${dayjs(existing.renewalDate).format("MMM D, YYYY")}`
            })
        }

        if (!isUpgrade) {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success: false,
                message: "Unable to process the requested change"
            })
        }

        const order = await razorpay.orders.create({
            amount: pricing[plan] * 100,
            currency: "INR",
            receipt: `upgrade_${existing._id}_${Date.now()}`,
            notes: {
                userId: String(userId),
                plan: plan
            }
        })

        existing.pendingUpgrade = {
            planType: plan,
            monthlyPrice: pricing[plan],
            expectedAmount: pricing[plan],
            razorpayOrderId: order.id,
            requestedAt: new Date()
        }

        await existing.save({ session })
        await session.commitTransaction()
        session.endSession()

        return res.status(200).json({
            success: true,
            order,
            message: wasAutoCreated
                ? "Pay now order created. A Free subscription was auto-created for this user."
                : "Pay now order created"
        })
    } catch (error) {
        await session.abortTransaction()
        session.endSession()
        console.log("Error in createPayNowOrder...", error)
        return res.status(500).json({
            success: false,
            message: "Unable to create payment order"
        })
    }
}