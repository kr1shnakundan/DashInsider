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


        const activeSubs = await Subscription.find({status:{ $in: ["Active", "Past_due"] }})

        const paidSubscribers = activeSubs.length

        console.log(typeof activeSubs[0].monthlyPrice)

        const mrr = activeSubs
        .filter(sub => sub.status === "Active")
        .reduce(
            (sum,sub) => sum + sub.monthlyPrice ,0
        )

        const totalUsers = await User.countDocuments()
        const paidUsers = await Subscription.countDocuments({
            status:{$in:["Active","Past_due"]}, 
            monthlyPrice: { $gt: 0 } 
        })

        const totalSubscribers = await Subscription.countDocuments()
        const totalCanceledSubscribers = await Subscription.countDocuments({status:{$in:["Canceled"]}})


        const conversionRate = totalUsers === 0 ? 0 : (paidUsers / totalUsers) *100
        const churnRate = totalSubscribers === 0 ? 0 : (totalCanceledSubscribers / totalSubscribers) * 100
        const retentionRate = totalUsers === 0 ? 0 : (mau /totalUsers) * 100  //===This retentionRate is not useful as it's decreases
                                                                            // over time and it only depends on totalUsers ever made


        return res.status(200).json({
            status:true,
            data: {
                timestamp: new Date().toISOString(),
                mau,
                newSignups,
                paidSubscribers,
                mrr,
                conversionRate:conversionRate.toFixed(2),
                churnRate:churnRate.toFixed(2),
                retentionRate:retentionRate.toFixed(2)
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

