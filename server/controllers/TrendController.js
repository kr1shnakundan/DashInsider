const Subscription = require("../models/Subscription")
const User = require("../models/User")
const dayjs = require("dayjs")

exports.getTrends = async(req,res)=>{
    try{

        const days = parseInt(req.query.days) || 30

        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                message: "Days must be between 1 and 365"
            })
        }
        const startedDate = dayjs().subtract(days, "day").toDate();
        const signUpTrends = await User.aggregate([
            {$match:{createdAt:{$gte:startedDate}}},
            {
                $group:{
                    _id:{
                        $dateToString:{format:"%Y-%m-%d",date:"$createdAt"}
                    },
                    count:{$sum:1}
                }
            },
            {$sort:{_id:1}},
            {
                $project:{
                    _id:0,
                    date:"$_id",
                    count:"$count"
                }
            }
        ])

        const mrrTrends = []
        for(let i = 0 ; i< days; i++){
            const date = dayjs().subtract(i , "day").format("YYYY-MM-DD")
            const dailyMRR = await Subscription.aggregate([
                {
                    $match:{
                        status:"Active",
                        startedDate:{$lte:dayjs(date).toDate()},
                        $or:[
                            {renewalDate:{$gte:dayjs(date).toDate()}},
                            {renewalDate:{$exists:false}}
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$monthlyPrice" }
                    }
                }
            ])
            mrrTrends.push({
                date,
                mrr: dailyMRR[0]?.revenue || 0
            })
        }

        mrrTrends.reverse()

        return res.status(200).json({
            success:true,
            signUpTrends,
            mrrTrends,
            message:`trends fetched Successfully`
        })
    } catch(error){
        console.error("Error fetching trends:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching trends."
        })
    }
}