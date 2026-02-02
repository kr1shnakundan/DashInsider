const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName:{
        type:String,
        required:true,
        trim:true
    },
    lastName:{
        type:String,
        required:true,
        trim:true,
        default:""
    },
    image:{
        type:String
    },
    email:{
        type:String,
        required:true,
        trim:true,
        unique:true
    },
    password:{
        type:String,
        required:function(){
            return !this.googleId;
        }
    },

    accountType:{
        type:String,
        required:true,
        enum:["Admin","Analyst","Support"],
        default:"Analyst"
    },
    additionalDetails:{                     //--->Keeping it for future use
        type:mongoose.Schema.Types.ObjectId,
        ref:"Profile"
    },
    resetPasswordExpires:{
        type:Date,
    },
    token:{
        type:String,
    },
    googleId:{
        type:String
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    lastActiveAt:{
        type:Date,
        default:Date.now
    }


})

module.exports = mongoose.model("User",userSchema);