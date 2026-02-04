const cron = require('node-cron')
const Subscription = require("../models/Subscription")
const dayjs = require("dayjs")

//============================================This job runs daily at midnight to process pending downgrades============================================//
//=========================================== However,i have not checked it in action yet============================================//
cron.schedule("0 0 * * *",async()=>{
    console.log("checking for pending downgrades...")

    try{
       const subscriptions = await Subscription.find({
        "pendingDowngrade.effectiveDate":{
            $lte:new Date()
        },
        status:"Active"
       }) 

       for (const sub of subscriptions){

        // Store pending downgrade data before clearing it
        const newPlanType = sub.pendingDowngrade.planType
        const newMonthlyPrice = sub.pendingDowngrade.monthlyPrice


        sub.subscriptionType = newPlanType
        sub.monthlyPrice = newMonthlyPrice
        sub.startedDate = new Date()
        sub.renewalDate = dayjs().add(30,"day").toDate()

        if(newPlanType !== "Free"){
            sub.paymentHistory.push({
                date: new Date(),
                amount:newMonthlyPrice,
                paymentStatus:"success",
                failureReason:undefined
            })
        }

        sub.pendingDowngrade = undefined

        await sub.save()
       }
    } catch(error){
        console.log("Error in processing downgrades...",error)
    }
})