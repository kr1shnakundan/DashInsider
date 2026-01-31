const express = require("express");
const router = express.Router();

router.post("/register",(req,res)=>{
    console.log("this is register router");
    res.json({
        message:"Register is working"
    })
})

router.post("/login",(req,res)=>{
    console.log("This is login router....");
    res.json({
        message:"Login is working perfectly"
    })
})

module.exports = router;