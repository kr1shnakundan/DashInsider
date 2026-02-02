const express = require("express");
const router = express.Router();

const {sendOtp , registerUser,login} = require("../controllers/AuthController");

router.post("/register",registerUser);
router.post("/sendotp",sendOtp);
router.post("/login",login);


module.exports = router;