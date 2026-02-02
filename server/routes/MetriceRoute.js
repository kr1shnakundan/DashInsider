const express = require("express")
const router = express.Router()

const {getMetrics} = require("../controllers/MetriceController")
const {auth} = require("../middlewares/authMiddleware")


router.get("/",auth ,getMetrics);


module.exports = router