const bcrypt = require("bcrypt")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const otpGenerator = require("otp-generator")         //====== start date ->31/01/2026
const User = require("../models/User")
const OTP = require("../models/OTP")
const mailSender = require("../utils/MailSender")
const Profile = require("../models/Profile")
require("dotenv").config()


exports.sendOtp = async(req,res)=>{
    const session = await mongoose.startSession()
    session.startTransaction()
    try{
        const {email} = req.body
        if(!email){
            await session.abortTransaction()
            session.endSession()
            return res.status(404).json({
                success:false,
                message:`email not found for otp`
            })

        }

        const checkUserPresent =  await User.findOne({email}, null ,{session});
        if(checkUserPresent){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`user already exist`
            })
        }

        let otp = otpGenerator.generate(6,{
            digits:true,
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        })

        let exists = await OTP.findOne({ otp },null ,{session});
        let attempt = 0;
        while(exists && attempt < 5){
            otp = otpGenerator.generate(6,{
                digits:true,
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false,
            })
            exists = await OTP.findOne({ otp },null ,{session});
            attempt++;
        }

        const otpPayload = { email, otp };
        const otpBody = await OTP.create([otpPayload],{session});
        if(!otpBody || !otpBody[0]){
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success:false,
                message:`unable to create otp`
            })
        }
        console.log("OTP Body:", otpBody);
        

        const otpMailResponse = await mailSender(email,"Verification email from DashInsider",otp)

        if(!otpMailResponse){
           await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`Otp not send to mail`
            })
        }

        await session.commitTransaction();
        session.endSession();

        const responsePayload = {success:true, message:`otp send Successfully`,}
        responsePayload.otp = otp


        return res.status(200).json(responsePayload)
    } catch(error){
       await  session.abortTransaction()
        session.endSession()
        console.log("Error in sendOtp..:".error)
        res.status(500).json({
            status:false,
            message:`Unable to send OTP`
        })
    }
}

exports.registerUser = async(req,res)=>{
    const session = await mongoose.startSession()
    session.startTransaction()
    try{
        const {firstName,lastName,accountType,email,password,otp} = req.body

        if(!firstName || !lastName || !accountType || !email || !password ||!otp){
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success:false,
                message:`please fill all the details carefully!`
            })
        }

        const existingUser = await User.findOne({email},null,{session});

        if(existingUser){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`user already exist`
            })
        }

        const response = await OTP.find({email},null,{session}).sort({createdAt:-1}).limit(1)
        if(response.length === 0){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`otp not found`
            })
        }

        console.log("response in otp.......",response)
        console.log(typeof otp,typeof response[0].otp);

        if(otp !== response[0].otp){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`otp is incorrect`
            })
        }

        const hashPassword = await bcrypt.hash(password,10);
        const approved = accountType === "Admin" ? false : true;

        const profileDetails = await Profile.create([{
            gender:null,
            dateOfBirth:null,
            about:null,
            contactNumber:null,
            profession:null
        }],{session});

        console.log("profileDetails........",profileDetails)

        if(!profileDetails || !profileDetails[0]){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`profileDetails not created for this user`
            })
        }

        const fullName = `${firstName} ${lastName}`.trim()

        const user = await User.create([{
            firstName,
            lastName,
            email,
            accountType:accountType,
            approved:approved,
            additionalDetails:profileDetails[0]._id,
            password:hashPassword,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${encodeURIComponent(fullName)}`

        }],{session})

        if(!user || !user[0]){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`unable to create user`
            })
        }


        await session.commitTransaction()
        session.endSession()

        return res.status(200).json({
            success:true,
            user:user[0],
            message:`user registered Successfully`
        })
        
    } catch(error){
        await session.abortTransaction();
        session.endSession();
        console.log("Error in registering user...:",error)
        return res.status(500).json({
            success:false,
            message:`Unable to register user`
        })

    }
}


exports.login = async(req,res) =>{
    const session = await mongoose.startSession()
    session.startTransaction()
    try{
        const {email , password} = req.body

        if(!email || !password){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`please enter the details carefully`
            })
        }

        const user = await User.findOne({email},null,{session})
        if(!user){
            await session.abortTransaction()
            session.endSession()
            return res.status(404).json({
                success:false,
                message:`user does not exist for this email`
            })
        }

        if(user.googleId && !user.password){
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success:false,
                message:`This account uses Google Sign-In. Please use the 'Login with Google' button.`
            })
        }

        if(await bcrypt.compare(password,user.password)){
            const payload = {
                email:email,
                id:user._id,
                accountType:user.accountType
            }

            const token = jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:"24h"})

            user.token = token
            user.lastActiveAt = new Date(); 
            await user.save({ session })
            
            const safeUser = user.toObject();
            delete safeUser.password;

            const options = {
                expires: new Date(Date.now() + 24*60*60*1000),
                httpOnly:true,
                sameSite: 'lax'
            }

            await session.commitTransaction()
            session.endSession()
            return res.cookie("token",token,options).status(200).json({
                success:true,
                token,
                user:safeUser,
                message:`user logged in successfully`
            })

        } else{
            await session.abortTransaction()
            session.endSession()
            return res.status(401).json({
                success:false,
                message:`password does not matches`
            });
        }
    } catch(error){
        await session.abortTransaction()
        session.endSession()
        console.log("Error in login..:",error)
        return res.status(500).json({
            success:false,
            message:`Unable to login , please try again..`
        })

    }
}