const dayjs = require("dayjs")
const Subscription = require("../models/Subscription")

exports.churnRiskPrediction = async(req,res)=>{
    try{
        const subs = await Subscription.find({})
        .populate("userId","email lastActiveAt")

        const result = subs.map((sub)=>{
            let risk = 0
            risk = Math.min(risk, 100)  // Cap at 100%
            if(sub.status==="Past_due"){
                risk += 50
            }
            if(sub.userId.lastActiveAt){
                const inactiveDays = dayjs().diff(sub.userId.lastActiveAt , "day")
                if(inactiveDays>30){
                    risk +=30
                }
            }

            

            if(sub.renewalDate){
                const nearRenewalDays = dayjs(sub.renewalDate).diff(dayjs(),"day")
                if(nearRenewalDays < 5 ){
                    risk += 10
                }
            }

            if(sub.pendingDowngrade && sub.pendingDowngrade.planType){
                risk +=10
            }

            return {
                email:sub.userId.email,
                plan:sub.subscriptionType,
                churnRisk:risk
            }

        })

        const highChurnRisk = result.filter((sub=>sub.churnRisk >=50))

        return res.status(200).json({
            success:true,
            highChurnRisk:highChurnRisk,
            totalHighChurnRisk:highChurnRisk.length,
            message:`churn risk calculated successfully`
        })
    } catch(error){
        console.log("Churn risk prediction error...",error)
        return res.status(500).json({
            success:false,
            message:`Unable to calculate churn risk`
        })
    }
}