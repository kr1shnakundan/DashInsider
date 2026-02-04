const database = require("../config/database");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const dayjs = require("dayjs");
require("dotenv").config();
const bcrypt = require("bcrypt")
const Profile = require("../models/Profile")

const plans = [
    {name:"Free",monthlyPrice:0},
    {name:"Pro",monthlyPrice:499},
    {name:"Premium",monthlyPrice:999}
]

const RandomDate = (daysBack = 90) =>{
   return dayjs().subtract(Math.floor(Math.random()*daysBack),"day").toDate();
}

const generatePaymentHistoryAndStatus = (subscriptionType,startedDate) => {
    const history = []
    const plan = plans.find(p => p.name === subscriptionType);

    if(plan.monthlyPrice === 0){
        return {
            status:"Active",
            paymentHistory:history
        }
    }

    //calculate months since startedDate
    const monthsSinceStart = dayjs().diff(dayjs(startedDate),"month")
    const paymentToGenerate = Math.min(monthsSinceStart+1,12)  //max 12 month ka history

    let lastPaymentStatus = null 
   

    for(let i = paymentToGenerate-1 ; i>=0; i--){
        const paymentDate = dayjs(startedDate).add(paymentToGenerate-i-1 ,'month').toDate()

        //don't generate the future payment
        if(dayjs(paymentDate).isAfter(dayjs())) continue

        // Determine payment status
        let paymentStatus;
        let failureReason = null;

        // Last payment (most recent) - determines current status
        if(i===0){
            const chance = Math.random()

            // 75% success (Active)
            if (chance < 0.75) {
                paymentStatus = "success";
            }
            // 10% pending (Active but processing)
            else if (chance < 0.85) {
                paymentStatus = "pending";
            }
            // 15% failed (Past_due)
            else {
                paymentStatus = "failed";
                const reasons = [
                    "Insufficient funds",
                    "Card expired",
                    "Payment declined by bank",
                    "Invalid card details",
                    "Card limit exceeded"
                ];
                failureReason = reasons[Math.floor(Math.random() * reasons.length)];
            }

            lastPaymentStatus = paymentStatus
        }
        // Historical payments - mostly successful
        else{
            const chance = Math.random()
            //90% historical success
            if(chance < 0.9){
                paymentStatus = "success"
            }
            // 10% historical failures
            else {
                paymentStatus = "failed";
                const reasons = [
                    "Insufficient funds",
                    "Card expired",
                    "Payment declined by bank"
                ];
                failureReason = reasons[Math.floor(Math.random() * reasons.length)];
            }
        
        }
        history.push({
            date:paymentDate,
            amount: plan.monthlyPrice,
            paymentStatus: paymentStatus,
            failureReason:paymentStatus === "failed" ? failureReason : undefined
        })
    }
    
    // Determine subscription status based on payment history
    let subscriptionStatus;
    if (history.length === 0) {
        // No payments yet (new subscription)
        subscriptionStatus = "Active";
    } else if (lastPaymentStatus === "failed") {
        // Last payment failed = Past_due
        subscriptionStatus = "Past_due";
    } else if (lastPaymentStatus === "success" || lastPaymentStatus === "pending") {
        // Last payment succeeded or pending = Active
        subscriptionStatus = "Active";
    } else {
        subscriptionStatus = "Active"; // Default
    }


    // Random 10% chance of being Canceled (user decided to cancel)
    if (Math.random() < 0.10 && subscriptionStatus === "Active") {
        subscriptionStatus = "Canceled";
    }
    
    return {
        paymentHistory: history,
        status: subscriptionStatus
    }
}

const seed = async()=>{
    try{
        await database.connect();


        console.log("clearing old data...");
        await User.deleteMany({});
        await Subscription.deleteMany({});
        await Profile.deleteMany({});
        
        console.log("seeding new data...");

        const users = [];
        const passwordHash = await bcrypt.hash("000000",10);

        for(let i = 0; i<300; i++){

            const profileDetails = await Profile.create({
                        gender:null,
                        dateOfBirth:null,
                        about:null,
                        contactNumber:null,
                        profession:null
                    });

            users.push({
                firstName:`User${i}`,
                lastName:"Demo",
                email:`user${i}@test.com`,
                additionalDetails:profileDetails._id,
                accountType: "Analyst",
                password:passwordHash,
                createdAt:RandomDate(),
                lastActiveAt:RandomDate(30),
                image:`https://api.dicebear.com/5.x/initials/svg?seed=User${i}Demo`
            })

            // Progress indicator
            if ((i + 1) % 50 === 0) {
                console.log(`  ✓ Created ${i + 1} users...`);

            }
        }

        const insertedUsers = await User.insertMany(users);

        console.log(`✓ Created ${users.length} users`);

        console.log("seeding Subscriptions...");

        let subscriptionCount = 0;
        let totalPayments = 0;
        

        for(const user of insertedUsers){
            const plan = plans[Math.floor(Math.random() * plans.length)];
            const startedDate = RandomDate(180)

            // ✅ Generate payment history and determine status based on it
            const { paymentHistory, status } = generatePaymentHistoryAndStatus(
                plan.name, 
                startedDate
            );

            totalPayments += paymentHistory.length;

            // Calculate renewal date based on status
            let renewalDate = null;
            if (status === "Active") {
                // Next payment due in 30 days from last payment or start date
                const lastPayment = paymentHistory.length > 0 
                    ? paymentHistory[paymentHistory.length - 1].date
                    : startedDate;
                renewalDate = dayjs(lastPayment).add(30, "day").toDate();
            } else if (status === "Past_due") {
                // Overdue - should have renewed already
                const lastPayment = paymentHistory.length > 0 
                    ? paymentHistory[paymentHistory.length - 1].date
                    : startedDate;
                renewalDate = dayjs(lastPayment).add(30, "day").toDate();
            }

            let cancellationDate = null
            if(status === "Canceled"){
                const lastSuccessfulPayment = [...paymentHistory]
                .reverse()
                .find(p=>p.paymentStatus ==="success") 
                 if (lastSuccessfulPayment) {
                    cancellationDate = dayjs(lastSuccessfulPayment.date)
                        .add(Math.floor(Math.random() * 20) + 1, "day")
                        .toDate();
                } else {
                    cancellationDate = dayjs(startedDate)
                        .add(Math.floor(Math.random() * 30), "day")
                        .toDate();
                }
            }

            await Subscription.create({
                userId:user._id,
                subscriptionType:plan.name,
                status,
                startedDate:startedDate,
                renewalDate: renewalDate,
                cancellationDate: cancellationDate,
                monthlyPrice:plan.monthlyPrice,
                paymentHistory:paymentHistory
            })

             subscriptionCount++;

            // Progress indicator
            if (subscriptionCount % 50 === 0) {
                console.log(`  ✓ Created ${subscriptionCount} subscriptions...`);
            }
           

        }
         console.log(`✓ Created ${subscriptionCount} subscriptions`);

        // console.log("\n--- Summary ---");
        // console.log(`Total Users: ${users.length}`);
        // console.log(`Total Subscriptions: ${subscriptionCount}`);
        // console.log(`💰 Generated ${totalPayments} payment records`);



        //==========================================This is database summary in console===================================
                // Summary statistics
        console.log("\n📊 === Database Summary ===");
        
        const totalUsers = await User.countDocuments();
        const totalSubs = await Subscription.countDocuments();
        
        console.log(`Total Users: ${totalUsers}`);
        console.log(`Total Subscriptions: ${totalSubs}`);
        
        // Subscription status breakdown
        const statusCounts = await Subscription.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        console.log("\n📈 Subscription Status:");
        statusCounts.forEach(s => console.log(`  ${s._id}: ${s.count}`));

        // Plan distribution
        const planCounts = await Subscription.aggregate([
            { $group: { _id: "$subscriptionType", count: { $sum: 1 } } }
        ]);
        console.log("\n💎 Subscription Plans:");
        planCounts.forEach(p => console.log(`  ${p._id}: ${p.count}`));

        // Payment statistics
        const paymentStats = await Subscription.aggregate([
            { $unwind: "$paymentHistory" },
            {
                $group: {
                    _id: "$paymentHistory.paymentStatus",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$paymentHistory.amount" }
                }
            }
        ]);
        console.log("\n💳 Payment History Stats:");
        paymentStats.forEach(p => {
            console.log(`  ${p._id}: ${p.count} payments (₹${p.totalAmount.toLocaleString()})`);
        });

        // Verify Active subscriptions have successful payments
        const activeWithFailedPayment = await Subscription.countDocuments({
            status: "Active",
            $or: [
                { "paymentHistory.0": { $exists: true } },
                { subscriptionType: { $ne: "Free" } }
            ],
            "paymentHistory": {
                $not: {
                    $elemMatch: { paymentStatus: "success" }
                }
            }
        });
        
        console.log(`\n✅ Data Validation:`);
        console.log(`  Active paid subs without successful payment: ${activeWithFailedPayment}`);

        // MRR calculation
        const mrr = await Subscription.aggregate([
            { $match: { status: "Active" } },
            { $group: { _id: null, total: { $sum: "$monthlyPrice" } } }
        ]);
        console.log(`\n💰 Monthly Recurring Revenue (MRR): ₹${(mrr[0]?.total || 0).toLocaleString()}`);

        // Failed payments
        const failedPayments = await Subscription.aggregate([
            { $unwind: "$paymentHistory" },
            { $match: { "paymentHistory.paymentStatus": "failed" } },
            { $count: "total" }
        ]);
        console.log(`⚠️  Failed Payments: ${failedPayments[0]?.total || 0}`);

        // Past due details
        const pastDueDetails = await Subscription.aggregate([
            { $match: { status: "Past_due" } },
            { $unwind: "$paymentHistory" },
            { $sort: { "paymentHistory.date": -1 } },
            {
                $group: {
                    _id: "$_id",
                    lastPayment: { $first: "$paymentHistory" },
                    totalAmount: { $sum: "$monthlyPrice" }
                }
            }
        ]);
        console.log(`\n⏰ Past Due Subscriptions: ${pastDueDetails.length}`);
        if (pastDueDetails.length > 0) {
            console.log(`   Total outstanding: ₹${pastDueDetails.reduce((sum, d) => sum + d.totalAmount, 0).toLocaleString()}`);
        }


        console.log("Seed complete 🌱");
        process.exit(0);
    } catch(error){
        console.log("Errror while seeding...:",error)
        process.exit(1)
    }
    
}

seed();