const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
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
    pendingDowngrade: {
        planType: {
            type: String,
            enum: ["Free", "Pro", "Premium"]
        },
        monthlyPrice: {type: Number},
        effectiveDate: {type: Date}
    }
})

module.exports = mongoose.model("Subscription",subscriptionSchema)