const express = require("express")
const router = express.Router()

const {getMetrics, getLTV} = require("../controllers/MetriceController")
const {auth} = require("../middlewares/authMiddleware")


router.get("/",auth ,getMetrics);
router.get("/getltv",auth ,getLTV)


module.exports = router