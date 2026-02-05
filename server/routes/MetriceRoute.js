const express = require("express")
const router = express.Router()

const {getMetrics, getLTV, planChurnAnalytics} = require("../controllers/MetriceController")
const {auth} = require("../middlewares/authMiddleware")


router.get("/",auth ,getMetrics);
router.get("/getltv",auth ,getLTV)
router.get("/churnanalytics",auth , planChurnAnalytics)


module.exports = router