const PricingPlan = require("../models/PricingPlan");
const Razorpay = require("razorpay");
const { createAuditLog } = require("./AuditLogController");

require("dotenv").config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

/**
 * Create new Razorpay plan for updated pricing
 * Automatically generates a new item with the updated price
 */
const createRazorpayPlan = async (planType, monthlyPrice) => {
    // Free plan doesn't need Razorpay
    if (planType === "Free" || monthlyPrice <= 0) {
        return null;
    }

    try {
        console.log(`Creating new Razorpay plan for ${planType} at price ${monthlyPrice}`);

        const amountInPaise = Math.round(monthlyPrice * 100);

        const plan = await razorpay.plans.create({
            period: "monthly",
            interval: 1,
            item: {
                name: `${planType} Plan`,
                amount: amountInPaise,
                currency: "INR",
                description: `Monthly subscription for ${planType} tier`
            },
            notes: {
                planType: planType,
                updatedAt: new Date().toISOString()
            }
        });

        if (!plan || !plan.id) {
            console.error("Razorpay returned invalid plan response:", plan);
            return null;
        }

        console.log(`✅ Razorpay plan created: ${plan.id} with Item ID: ${plan.item?.id}`);
        return {
            planId: plan.id,
            itemId: plan.item?.id || null
        };
    } catch (error) {
        console.log("error in createRazorpayPlan......", error);
        console.error(`❌ Error creating Razorpay plan for ${planType}:`, {
            message: error.message,
            response: error.response?.data,
            status: error.response?.statusCode
        });
        throw new Error(`Failed to create Razorpay plan: ${error.message}`);
    }
};

/**
 * Bulk update pricing for one or multiple plans
 * Archives old plans (isActive: false) and creates new ones (isActive: true)
 * POST /admin/bulk/update-pricing
 */
exports.bulkUpdatePricing = async (req, res) => {
    try {
        const { pricingUpdates } = req.body;
        
        if (!Array.isArray(pricingUpdates) || pricingUpdates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "pricingUpdates must be a non-empty array"
            });
        }

        const validPlanTypes = ["Free", "Pro", "Premium"];
        const results = [];
        const errors = [];

        for (const update of pricingUpdates) {
            const { planType, monthlyPrice, description } = update;

            // Validation
            if (!planType || !validPlanTypes.includes(planType)) {
                errors.push({
                    planType: planType || "missing",
                    error: "Invalid or missing planType"
                });
                continue;
            }

            const parsedMonthlyPrice = Number(monthlyPrice);
            if (!Number.isFinite(parsedMonthlyPrice) || parsedMonthlyPrice < 0) {
                errors.push({
                    planType,
                    error: "monthlyPrice must be a non-negative number"
                });
                continue;
            }

            try {
                // Find all currently active pricing plans (handle duplicates)
                const activePricingPlans = await PricingPlan.find({
                    planType, 
                    isActive: true 
                });

                let activePricingPlan = activePricingPlans[0] || null;

                const oldPrice = activePricingPlan?.monthlyPrice || null;
                const oldRazorpayPlanId = activePricingPlan?.razorpayPlanId || null;
                const effectiveDate = new Date();
                let newRazorpayPlanId = null;
                let newRazorpayItemId = null;

                // Create new Razorpay plan if price changed for paid plans
                if (parsedMonthlyPrice > 0) {
                    try {
                        const razorpayData = await createRazorpayPlan(planType, parsedMonthlyPrice);
                        if (razorpayData) {
                            newRazorpayPlanId = razorpayData.planId;
                            newRazorpayItemId = razorpayData.itemId;
                        }
                    } catch (rzError) {
                        console.log("unable to create new razorpayPlan...", rzError);
                        errors.push({
                            planType,
                            error: `Razorpay plan creation failed: ${rzError.message}`
                        });
                        continue;
                    }
                }

                if (activePricingPlans.length > 0) {
                    await PricingPlan.updateMany(
                        { _id: { $in: activePricingPlans.map(plan => plan._id) } },
                        { $set: { isActive: false } }
                    );
                    activePricingPlan = activePricingPlan || activePricingPlans[0];
                }

                const newPricingPlan = new PricingPlan({
                    planType,
                    monthlyPrice: parsedMonthlyPrice,
                    razorpayItemId: newRazorpayItemId,
                    razorpayPlanId: newRazorpayPlanId,
                    effectiveDate,
                    description: description || (activePricingPlan ? activePricingPlan.description : ""),
                    updatedBy: req.user.id,
                    isActive: true
                });

                await newPricingPlan.save();

                // Log audit trail
                await createAuditLog({
                    actorId: req.user?.id,
                    action: "pricing:bulk-update",
                    targetType: "PricingPlan",
                    targetId: newPricingPlan._id,
                    metadata: { 
                        planType, 
                        monthlyPrice,
                        razorpayPlanId: newRazorpayPlanId 
                    },
                    changes: {
                        oldPrice,
                        oldRazorpayPlanId,
                        newPrice: parsedMonthlyPrice,
                        newRazorpayPlanId,
                        effectiveDate
                    },
                    ip: req.ip || req.connection?.remoteAddress,
                    userAgent: req.get("user-agent"),
                    status: "success"
                });

                results.push({
                    planType,
                    oldPrice,
                    newPrice: parsedMonthlyPrice,
                    oldRazorpayPlanId,
                    newRazorpayPlanId,
                    effectiveDate,
                    message: `Pricing updated successfully for ${planType}`
                });

            } catch (error) {
                console.log("Error in updating single plan...", error);
                errors.push({
                    planType,
                    error: error.message
                });
            }
        }

        return res.status(results.length > 0 ? 200 : 400).json({
            success: results.length > 0,
            data: {
                updated: results,
                failed: errors
            },
            message: `${results.length} pricing plan(s) updated. ${errors.length} error(s).`
        });

    } catch (error) {
        console.log("Error in bulkUpdatePricing:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update pricing plans",
            error: error.message
        });
    }
};

/**
 * Get all active pricing plans
 * GET /admin/pricing
 */
exports.getPricingPlans = async (req, res) => {
    try {
        const pricingPlans = await PricingPlan.find({ isActive: true })
            .populate("updatedBy", "firstName lastName email")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: pricingPlans,
            message: "Pricing plans fetched successfully"
        });

    } catch (error) {
        console.log("Error in getPricingPlans:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch pricing plans"
        });
    }
};

/**
 * Get current pricing for new subscriptions
 * GET /pricing/current
 */
exports.getCurrentPricing = async (req, res) => {
    try {
        const pricingPlans = await PricingPlan.find({ isActive: true })
            .select("planType monthlyPrice");

        // Format into object for easy consumption
        const pricing = {};
        pricingPlans.forEach(plan => {
            pricing[plan.planType] = plan.monthlyPrice;
        });

        // Ensure all plan types exist with default fallback
        const allPlans = ["Free", "Pro", "Premium"];
        allPlans.forEach(planType => {
            if (!pricing[planType]) {
                pricing[planType] = 0; // Default to 0 if not found
            }
        });

        return res.status(200).json({
            success: true,
            data: pricing,
            message: "Current pricing fetched"
        });

    } catch (error) {
        console.log("Error in getCurrentPricing:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch current pricing"
        });
    }
};
