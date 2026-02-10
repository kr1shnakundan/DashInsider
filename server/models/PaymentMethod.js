const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    razorpayMethodId: { type: String, required: true, unique: true },
    razorpayCardId: { type: String, unique: true, sparse: true },
    razorpayTokenId: { type: String },
    razorpayCustomerId: { type: String },
    methodType: { type: String, default: "card" },
    cardDetails: {
        last4: String,
        network: String,
        cardType: String,
        issuer: String,
        expiryMonth: Number,
        expiryYear: Number
    },
    isDefault: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "expired", "deleted"], default: "active" },
    upiDetails: { vpa: String },
    bankDetails: { bankName: String },
}, { timestamps: true });

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);