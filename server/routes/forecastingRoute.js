const express = require("express")
const router = express.Router()

const { churnRiskPrediction } = require("../controllers/forecastingController")
const { auth } = require("../middlewares/authMiddleware")


router.get("/churnrisk",auth,churnRiskPrediction)

module.exports = router