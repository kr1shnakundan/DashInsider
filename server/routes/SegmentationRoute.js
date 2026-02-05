const express = require("express")
const router = express.Router()


const { planSegmentation } = require("../controllers/SegmentationController")
const {auth} = require("../middlewares/authMiddleware")

router.get("/",auth ,planSegmentation)


module.exports = router
