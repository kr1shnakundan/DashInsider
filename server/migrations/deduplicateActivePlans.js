/**
 * Migration script to deduplicate active pricing plans
 * 
 * Ensures only ONE active plan per planType before the partial unique index is created.
 * For each planType with multiple active plans, keeps the most recent one and deactivates the rest.
 * 
 * Run this ONCE before deploying the updated PricingPlan schema.
 * 
 * Usage:
 *   node server/migrations/deduplicateActivePlans.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

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

const PricingPlan = mongoose.model("PricingPlan", pricingPlanSchema);

async function deduplicateActivePlans() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const planTypes = ["Free", "Pro", "Premium"];
        let totalDeactivated = 0;

        for (const planType of planTypes) {
            const activePlans = await PricingPlan.find({
                planType,
                isActive: true
            }).sort({ createdAt: -1 }); // Most recent first

            if (activePlans.length === 0) {
                console.log(`ℹ️  No active plans found for ${planType}`);
                continue;
            }

            if (activePlans.length === 1) {
                console.log(`✅ ${planType}: Only 1 active plan (ID: ${activePlans[0]._id})`);
                continue;
            }

            // Keep the first (most recent), deactivate the rest
            const toKeep = activePlans[0];
            const toDeactivate = activePlans.slice(1);

            console.log(`⚠️  ${planType}: Found ${activePlans.length} active plans`);
            console.log(`   Keeping: ${toKeep._id} (created ${toKeep.createdAt})`);
            console.log(`   Deactivating ${toDeactivate.length} older plan(s):`);

            for (const plan of toDeactivate) {
                console.log(`     - ${plan._id} (created ${plan.createdAt})`);
                plan.isActive = false;
                await plan.save();
                totalDeactivated++;
            }
        }

        console.log(`\n✅ Migration complete. Deactivated ${totalDeactivated} duplicate plan(s).`);
        console.log("You can now safely deploy the updated PricingPlan schema with the partial unique index.");

    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("Disconnected from MongoDB");
    }
}

deduplicateActivePlans();
