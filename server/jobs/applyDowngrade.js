const corn = require('node-cron')
const Subscription = require("../models/Subscription")
const dayjs = require("dayjs")

//============================================This job runs daily at midnight to process pending downgrades============================================//
//=========================================== However,i have not checked it in action yet============================================//
corn.schedule("0 0 * * *",async()=>{
    console.log("checking for pending downgrades...")

    try{
       const subscriptions = await Subscription.find({
        "pendingDowngrade.effectiveDate":{
            $lte:new Date()
        },
        status:"Active"
       }) 

       for (const sub of subscriptions){
        sub.subscriptionType = sub.pendingDowngrade.planType
        sub.monthlyPrice = sub.pendingDowngrade.monthlyPrice
        sub.pendingDowngrade = undefined
        sub.startedDate = new Date()
        sub.renewalDate = dayjs().add(30,"day").toDate()

        await sub.save()
        console.log(`Downgraded subscription ${sub._id} to ${sub.subscriptionType}`)
       }
    } catch(error){
        console.log("Error in processing downgrades...",error)
    }
})