const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv")
dotenv.config();

exports.auth = async(req,res,next)=>{
    try{
        let token = null;

        // 1. Check body
        if (req.body && req.body.token) {
            token = req.body.token;
        }

        // 2. Check cookies
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        // 3. Check Authorization header (with null check!)
        if (!token) {
            const authHeader = req.header("Authorization");
            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.replace("Bearer ", "").trim();
            }
        }


        if (!token) {
			return res.status(401).json({ success: false, message: `Token Missing` });
		}
        try{
            const decode = jwt.verify(token,process.env.JWT_SECRET)

            req.user = decode
        } catch(error){
            console.log("Error in decoding auth jwt : ",error)
            return res.status(401).json({
                success:false,
                message:`token is invalid`
            })
        }

        next()
    } catch(error){
         console.log("Auth middleware error:", error); 
        return res
				.status(401)
				.json({ success: false, message: "token is invalid" });
    }
}   

exports.requiredRoles=(...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.user.accountType)){
            return res.status(403).json({
                success:false,
                message:`Forbidden`
            })
        }

        next();
    }
}