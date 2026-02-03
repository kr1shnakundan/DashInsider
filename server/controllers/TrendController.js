const Subscription = require("../models/Subscription")
const User = require("../models/User")
const dayjs = require("dayjs")

exports.getTrends = async(req,res)=>{
    try{

        const {days} = req.query;
        const startDate = dayjs().subtract(days, "day").toDate();
        const signUpTrends = await User.aggregate([
            {$match:{createdAt:{$gte:startDate}}},
            {
                $group:{
                    _id:{
                        $dateToString:{format:"%Y-%m-%d",date:"$createdAt"}
                    },
                    count:{$sum:1}
                }
            },
            {$sort:{_id:1}}
        ])
        const mrrTrends = await Subscription.aggregate([
            {$match:{status:"Active"}},
            {
                $group:{
                    _id:{
                        $dateToString:{format:"%Y-%m-%d" , date:"$startedDate"}
                    },
                    revenue: {$sum:"$monthlyPrice"}
                }
            },
            {$sort:{_id:1}}
        ])

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