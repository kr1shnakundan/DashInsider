const express = require("express")
const router = express.Router()


const {getCohortRetention} = require("../controllers/CohortController")
const {auth} = require("../middlewares/authMiddleware")

router.get("/",auth , getCohortRetention)
module.exports = router