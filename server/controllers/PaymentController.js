const crypto = require("crypto")
const PaymentMethod = require("../models/PaymentMethod");
const User = require("../models/User");
const Razorpay = require("razorpay");

require("dotenv").config()


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

// exports.handleRazorpayWebhook = async(req,res) => {
//     try{
//         const secret = process.env.RAZORPAY_SECRET
//         const signature = req.headers["x-razorpay-signature"];

//         // 1. Security Verification
//         const body = JSON.stringify(req.body);
//         const expectedSignature = crypto
//             .createHmac("sha256", secret)
//             .update(body)
//             .digest("hex");

//         if (signature !== expectedSignature) {
//             return res.status(400).send("Invalid Signature");
//         }

//         const {event , payload} = req.body
//         console.log("reqest body in handlerazorpaywebhook....",req.body)

//         if (event === "payment.failed") {
//             console.log(`Alert: Payment failed for ${payload.payment.entity.email}. Reason: ${payload.payment.entity.error_description}`);
//             // Optional: You could update your Subscription schema status to "Past_due" here
//             return res.status(200).json({ success: true, message: "Failure logged" });
//         }


//         if(event === "order.paid" || event === "payment.captured" || event === "subscription.charged" || event === "payment.authorized"){
//             const payment = payload.payment.entity;

//             const user = await User.findOne({ email: payment.email })
//             if (!user) return res.status(200).send("User not found");


//             if(user){
//                 const updateData = {
//                     userId:user._id,
//                     razorpayTokenId:payment.token._id || payment.id,
//                     razorpayCustomerId:payment.customer._id,
//                     methodType:payment.method,
//                     isDefault:true
//                 }

//                 if (payment.method === "card") {

//                     let cardInfo = payment.card;

//                     if (payment.method === "card" && (!cardInfo.expiry_month || !cardInfo.expiry_year)) {
//                         try {
//                             cardInfo = await razorpay.cards.fetch(payment.card_id);
//                         } catch (err) {
//                             console.error("Error fetching full card details:", err);
//                         }
//                     }
//                     updateData.cardDetails = {
//                         last4: cardInfo.last4,
//                         network: cardInfo.network,
//                         cardType: cardInfo.type,
//                         expiryMonth: cardInfo.expiry_month,
//                         expiryYear: cardInfo.expiry_year
//                     };
//                 } else if (payment.method === "upi") {
//                     // UPI doesn't have "cards", so we might store the VPA (e.g., user@okicici)
//                     updateData.upiDetails = {
//                         vpa: payment.vpa 
//                     };
//                 }

//                 await PaymentMethod.updateMany({userId:user._id},{isDefault:false})
//                     await PaymentMethod.findOneAndUpdate(
//                         { razorpayTokenId: updateData.razorpayTokenId },
//                         updateData,
//                         { upsert: true }
//                         );      
//                 }
//             }

//         return res.status(200).json({
//             success:true,
//             message:`webhook working....`
//         })
//     } catch(error){
//         console.error("Error handling Razorpay webhook:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error" });  
//     }
// }


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

        // 2. Log Failures for Risk Monitor
        if (event === "payment.failed") {
            console.log(`Payment Failed: ${payment.email} - ${payment.error_description}`);
            return res.status(200).json({ success: true });
        }

        // 3. Handle Success Events
        const successEvents = ["order.paid", "payment.captured", "subscription.charged", "payment.authorized"];
        if (successEvents.includes(event)) {
            const user = await User.findOne({ email: payment.email });
            if (!user) return res.status(200).send("User not found");

            // Define a unique identifier for this payment method record
            // For cards, we use card_id; for others, we use the token or the payment ID itself
            const uniqueMethodId = payment.card_id || payment.token_id || payment.id;

            const updateData = {
                userId: user._id,
                razorpayCardId: payment.card_id || null, 
                razorpayTokenId: payment.token_id || null,
                razorpayCustomerId: payment.customer_id, 
                methodType: payment.method,
                isDefault: true
            };

            // 4. Extract Method-Specific Data
            if (payment.method === "card") {
                let cardInfo = payment.card;
                // Fetch full details if expiry is missing
                if (!cardInfo.expiry_month || !cardInfo.expiry_year) {
                    try { cardInfo = await razorpay.cards.fetch(payment.card_id); } 
                    catch (err) { console.error("Card Fetch Error:", err); }
                }
                updateData.cardDetails = {
                    last4: cardInfo.last4,
                    network: cardInfo.network,
                    cardType: cardInfo.type,
                    expiryMonth: cardInfo.expiry_month,
                    expiryYear: cardInfo.expiry_year
                };
            } else if (payment.method === "upi") {
                updateData.upiDetails = {
                    vpa: payment.vpa 
                };
            } else if (payment.method === "netbanking") {
                updateData.bankDetails = {
                    bankName: payment.bank
                };
            }

            // 5. Update Database
            await PaymentMethod.updateMany({ userId: user._id }, { isDefault: false });
            await PaymentMethod.findOneAndUpdate(
                { razorpayCardId: uniqueMethodId }, // Or use a compound key
                updateData,
                { upsert: true, new: true }
            );
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Webhook Error:", error);
        return res.status(500).json({ success: false });
    }
};