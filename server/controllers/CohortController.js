const dayjs = require("dayjs")
const User = require("../models/User")


exports.getCohortRetention =  async(req,res)=>{
    try{
        const users = await User.find({},"createdAt lastActiveAt")

        const cohort = {}
        const thirtyDaysAgo = dayjs().subtract(30, "day")

        users.forEach(user=>{
            if (!user.createdAt) return
            const cohortMonth = dayjs(user.createdAt).format("YYYY-MM")

            if(!cohort[cohortMonth]) cohort[cohortMonth] = {total : 0 , active : 0}

            cohort[cohortMonth].total++

            if (user.lastActiveAt && dayjs(user.lastActiveAt).isAfter(thirtyDaysAgo)) {
                cohort[cohortMonth].active++
            }
        })
        
        const result = Object.entries(cohort).map(([month , data])=>({
            month,
            retentionRate :( (data.active /data.total) *100).toFixed(2)+ '%'
        }))
        .sort((a, b) => a.month.localeCompare(b.month))


         return res.status(200).json({
            success: true,
            data: result
        });
    } catch(error){
        console.log("Error occured while calculating cohort..",error)
        return res.status(500).json({
            success: false,
            message: "Failed to load cohort analytics"
        });
    }
}