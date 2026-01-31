const express = require("express");
const app = express();

const userRoute = require("./routes/UserRoute");


const dotenv = require("dotenv");
dotenv.config();
//  OR require("dontenv").config();

const database = require("./config/database")

const cors = require("cors");

const PORT = process.env.PORT || 4000;
app.use(express.json());

app.use(
    cors({
        origin:"http://localhost:3000",
        credentials:true
    })
)

app.use("/api/v1/auth",userRoute);

app.get("/",(req,res)=>{
    return res.json({
        success:true,
        message:`Server is on and running...`
    })
})

const startServer = async()=> {
    try{
        await database.connect();
        console.log("Database connected Successfully")
        app.listen(PORT ,()=>{
            console.log(`Server is running at port :${PORT}`);
        })
    } catch(error){
        console.log("Error occurred while connecting database...",error);
        process.exit(1);
    }
}

startServer();
