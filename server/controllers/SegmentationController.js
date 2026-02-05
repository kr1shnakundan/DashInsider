const Subscription = require("../models/Subscription")

exports.planSegmentation = async(req,res)=>{


    try{


        //====================myMethod was duplicacy included
        // const numberOfFreePlan = await Subscription.countDocuments({
        //     subscriptionType:"Free"
        // })

        // //only current subscription type is being considered , not the old type
        // const proPlans = await Subscription.aggregate([
        // {
        //     $match:{subscriptionType:"Pro"}
        // },
        //     {
        //         $addFields:{
        //             lastPayment:{$arrayElemAt:["$paymentHistory",-1]}
        //         }
        //     },{
        //         $match:{
        //             "lastPayment.paymentStatus":"success"
        //         }
        //     }
        // ])

        // const proRevenue = proPlans.reduce(
        //     (sum,plan)=>sum = sum+plan.lastPayment.amount ,0
        // )

        // const numberOfProPlan = proPlans.length


        // const premiumPlans = await Subscription.aggregate([
        //     {$match:{subscriptionType:"Premium"}},
        //     {
        //         $addFields:{
        //             lastPayment:{$arrayElemAt:["$paymentHistory",-1]}
        //         }
        //     },{
        //         $match:{
        //             "lastPayment.paymentStatus":"success"
        //         }
        //     }
        // ])

        // const premiumRevenue = premiumPlans.reduce(
        //     (sum,plan)=> sum = sum+plan.lastPayment.amount , 0
        // )

        // const numberOfPremiumPlan = premiumPlans.length

        // const planData = [
        //     {"plan":"Free","users":numberOfFreePlan , "revenue":0},
        //     {"plan":"Pro","users":numberOfProPlan , "revenue":proRevenue},
        //     {"plan":"Premium","users":numberOfPremiumPlan , "revenue":premiumRevenue},
        // ]


        const segments = await Subscription.aggregate([
           { $match:{status:"Active"}},
           {
            $addFields:{
                lastPayment:{
                    $cond:{
                        if:{
                            $and:[
                                {$isArray:"$paymentHistory"},
                                {$gt:[{$size:"$paymentHistory"},0]}
                            ]
                        },
                        then:{$arrayElemAt:["$paymentHistory",-1]},
                        else:null
                    }
                }
            }
           },{
            $match:{
                $or:[
                    {subscriptionType:"Free"},
                    {"lastPayment.paymentStatus":"success"}
                ]
            }
           },{
            $group:{
                _id:"$subscriptionType",
                users:{$sum:1},
                revenue:{
                    $sum:{
                        $ifNull:["$lastPayment.amount",0]
                    }
                }
            }
           },{
            $project:{
                _id:0,
                plan:"$_id",
                users:1,
                revenue:1
            }
           },{
            $sort:{plan:1}
           }
        ])


        return res.status(200).json({
            success:true,
            planData:segments,
            message:`plan segmentation done successfuly`
        })
    } catch(error){
        console.log("Segmentation Error",error)
        return res.status(500).json({
            success:false,
            message: `unable to segment plan`
        })
    }
}