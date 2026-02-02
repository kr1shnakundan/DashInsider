
//========== FOR NOW , WE ARE ADDING PROFILE TO USER BUT NOT FUTURE USE =====================

const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    gender:{type:String},
    dateOfBirth:{type:Date},
    about:{type:String},
    contactNumber:{type:Number},
    profession:{type:String}
})

module.exports = mongoose.model("Profile",profileSchema);