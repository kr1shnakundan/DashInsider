const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User",
        unique: true
    },
    subscriptionType:{
        type:String,
        required:true,
        enum:["Free","Pro","Premium"],
        default:"Free"
    },
    startedDate:{
        type:Date,
        required:true,
        default:Date.now
    },
    renewalDate:{
        type:Date,
    },
    cancellationDate:{
        type:Date,

    },
    monthlyPrice:{
        type:Number,
        required:true,
        default:0
    },
    status:{
        type:String,
        required:true,
        enum:["Active","Canceled","Past_due"],
        default:"Active"
    },
    razorpayCustomerId: {
        type: String
    },
    razorpaySubscriptionId: {
        type: String
    },
    razorpayPlanId: {
        type: String
    },
    pastDueSince: {
        type: Date
    },
    graceUntil: {
        type: Date
    },
    pendingDowngrade: {
        planType: {
            type: String,
            enum: ["Free", "Pro", "Premium"]
        },
        monthlyPrice: {type: Number},
        effectiveDate: {type: Date}
    },
        pendingUpgrade: {
            planType: {
                type: String,
                enum: ["Free", "Pro", "Premium"]
            },
            monthlyPrice: { type: Number },
            expectedAmount: { type: Number },
            razorpayOrderId: { type: String },
            requestedAt: { type: Date }
        },
     // Payment history
    paymentHistory: [{
        date: Date,
        amount: Number,
        paymentStatus: { type: String, enum: ["success", "failed", "pending"] },
        failureReason: String,
        razorpayPaymentId: String,
        razorpayOrderId: String,
        event: String
    }],
},{timestamps:true})

module.exports = mongoose.model("Subscription",subscriptionSchema)