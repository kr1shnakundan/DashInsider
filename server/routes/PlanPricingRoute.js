const express = require("express");
const router = express.Router();

const {
    bulkUpdatePricing,
    getPricingPlans,
    getCurrentPricing
} = require("../controllers/AdminPricingController");

const { auth, requiredRoles } = require("../middlewares/authMiddleware");


router.post("/bulk/update-pricing", auth, requiredRoles("Admin"), bulkUpdatePricing);


router.get("/all-pricing", auth, requiredRoles("Admin"), getPricingPlans);


router.get("/current-price", getCurrentPricing);

module.exports = router;
