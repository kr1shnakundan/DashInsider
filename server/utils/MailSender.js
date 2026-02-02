const nodemailer = require("nodemailer")
require("dotenv").config()

const mailSender = async(email,title,body)=>{

    try{
        const transporter = nodemailer.createTransport({
        
            host:process.env.MAIL_HOST,
            auth:{
                user:process.env.MAIL_USER,
                pass:process.env.MAIL_PASS
            }
        });

        let info = await transporter.sendMail({
            from:"Developer's DashInsider <no-reply@wisdomversa.local>",
            to:email,
            subject:title,
            html:body
        })
        console.log("info in mailSender: " ,info);
        return info;
    } catch(error){
        console.log("Errorr in mailSender..:",error)

    }
}

module.exports = mailSender;