const mongoose = require("mongoose");

const pricingPlanSchema = new mongoose.Schema({
    planType: {
        type: String,
        required: true,
        enum: ["Free", "Pro", "Premium"]
    },
    monthlyPrice: {
        type: Number,
        required: true,
        default: 0
    },
    razorpayItemId: {
        type: String
    },
    razorpayPlanId: {
        type: String
    },
    currency: {
        type: String,
        default: "INR"
    },
    period: {
        type: String,
        default: "monthly"
    },
    interval: {
        type: Number,
        default: 1
    },
    effectiveDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

pricingPlanSchema.index(
    { planType: 1, isActive: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);

module.exports = mongoose.model("PricingPlan", pricingPlanSchema);
