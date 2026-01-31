const mongoose = require("mongoose");
const dotenv = require("dotenv")
dotenv.config();


const PORT = process.env.MONGO_URI


exports.connect=()=>{
    mongoose.connect(PORT)
    .then(console.log("Database connected Successfully"))
    .catch((error)=>{
        console.log("Error Occurred while connecting database is :",error);
        process.exit(1);
    });
}