const Subscription = require("../models/Subscription")
const User = require("../models/User")

exports.getSubscriptions = async(req,res)=>{
    try{
        const {page = 1,
            limit = 10,
            status,
            search
        } = req.query

        const query = {}

        if(status){
            query.status = status
        } 


        // Search by email (via populated user)
        if(search){
            const matchingUser = await User.find({  
                $or: [
                    {email:{$regex:search , $options:'i'}},
                    {firstName:{$regex:search,$options:'i'}},
                    {lastName:{$regex:search , $options:'i'}}
                ]
            }).select('_id')

            const userIds = matchingUser.map(user=>user._id)
            query.userId = {$in:userIds}
        }

        const subscriptions = await Subscription.find(query)
            .populate({
                path:"userId",
                select:"email firstName lastName"
            })
            .skip((page-1) *limit)
            .limit(Number(limit))
            .sort({startedDate:-1})

        const total = await Subscription.countDocuments(query)
        return res.status(200).json({
            success:true,
            data:subscriptions,
            pagination:{
                page:Number(page),
                limit:Number(limit),
                total,
                pages: Math.ceil(total/limit)
            },
            message:`subscriptions fetched successfully`
        })

    } catch(error){
        console.log("error in getSubscriptions..: ",error)
        return res.status(500).json({
            success:false,
            message:`unable to get Subscription`
        })
    }
}