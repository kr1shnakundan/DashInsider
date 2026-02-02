const User = require("../models/User")
const Subscription = require("../models/Subscription")
const dayjs = require("dayjs")


exports.getMetrics = async(req,res)=>{
    try{
        const {from , to } = req.body || {}

        const start = from ? new Date(from) : dayjs().subtract(30,"day").toDate();
        const end = to ? new Date(to):new Date();

        //New signup in the range of from - to
        const newSignups = await User.countDocuments({
            createdAt:{$gte:start , $lte:end}
        })

        //MAU - last active is 30days
        const mau = await User.countDocuments({
            lastActiveAt:{$gte:dayjs().subtract(30,"day").toDate()}
        })


        const activeSubs = await Subscription.find({status:"Active"})

        const paidSubscribers = activeSubs.length

        const mrr = activeSubs.reduce(
            (sum,sub) => sum + sub.monthlyPrice ,0
        )

        return res.status(200).json({
            status:true,
            data: {
                mau,
                newSignups,
                paidSubscribers,
                mrr
            },
            message:`Metrices fetched successfully`
        })
    } catch(error){
        console.log("Metrices error...",error)
        return res.status(500).json({
            success:false,
            message:`Unable to fetch Metrices`
        })
    }
}

