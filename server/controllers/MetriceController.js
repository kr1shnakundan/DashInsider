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


        const activeSubs = await Subscription.find({
            status:"Active",

            $or:[
                {subscriptionType:"Free"},
                {
                    subscriptionType:{$ne:"Free"},
                    paymentHistory:{
                        $elemMatch:{paymentStatus:"success"}
                    }
                }
            ]
        })

        const paidSubscribers = activeSubs.length


        const mrr = activeSubs.reduce(
            (sum,sub) => sum + sub.monthlyPrice ,0
        )


        const totalUsers = await User.countDocuments()
        const paidUsers = await Subscription.countDocuments({
            status:{$in:["Active","Past_due"]}, 
            monthlyPrice: { $gt: 0 } ,
            paymentHistory:{
                $elemMatch:{paymentStatus:"success"}
            }
        })

        const usersAtStart = await User.countDocuments({
            createdAt: { $lt: start }
        });

        const cancelledInPeriod = await Subscription.countDocuments({
            cancellationDate:{$gte:start , $lte:end}
        })

        const recoveredSubs = await Subscription.countDocuments({
            status:"Active",
            paymentHistory:{
                $elemMatch:{
                    date:{$gte:start , $lte:end},
                    paymentStatus:"success"
                }
            },
            $expr:{
                $gt:[
                    {$size:{$filter:{input:"$paymentHistory", cond:{$eq:["$$this.paymentStatus","failed"]}}}},0
                ]
            }
        })


        const pastDueInPeriod = await Subscription.countDocuments({
            $or: [
                { status: "Past_due" },
                {
                    paymentHistory: {
                        $elemMatch: {
                            date: { $gte: start, $lte: end },
                            status: "failed"
                        }
                    }
                }
            ]
        });

        const stillActiveUsers = await Subscription.countDocuments({
            createdAt: { $lt: start },
            lastActiveAt:{$gte:start }
        })

        const recoveryRate = pastDueInPeriod === 0 ? 0 : (recoveredSubs / pastDueInPeriod) * 100;
        const conversionRate = totalUsers === 0 ? 0 : (paidUsers / totalUsers) *100
        const churnRate = usersAtStart === 0 ? 0 : (cancelledInPeriod / usersAtStart) * 100
        const retentionRate = totalUsers === 0 ? 0 : (stillActiveUsers/newSignups) * 100


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
                retentionRate:retentionRate.toFixed(2),
                recoveryRate:recoveryRate.toFixed(2)
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


exports.getLTV = async(req,res)=>{
    try{

        const subs = await Subscription.find({monthlyPrice:{$gt:0}})

        if(subs.length === 0){
            return res.status(200).json({
                success:true,
                data:{ltv:0},
                message:`LTV fetched successfully`
            })
        }   
        
        let totalRevenue = 0
        let totalMonths = 0

        subs.forEach(sub=>{

            const successfulPayments = sub.paymentHistory.filter(p=>p.paymentStatus === "success")
            const actualRevenue = successfulPayments.reduce(
                (sum,payment)=>sum = sum+payment.amount , 0
            )

            totalRevenue = actualRevenue
            totalMonths = successfulPayments.length
        })

        const arpu = totalRevenue / subs.length
        const avgLifetime = totalMonths/subs.length
        const lvt = arpu

        return res.status(200).json({
            success:true,
            data:{
                ltv:lvt.toFixed(2),
                arpu:arpu.toFixed(2),
                avgLifetime:avgLifetime.toFixed(2)
            },
            message:`LTV fetched successfully`
        })
    }  catch(error){
        console.log("LTV error...",error)
        return res.status(500).json({
            success:false,
            message:`Unable to fetch LTV`
        })
    }
}

