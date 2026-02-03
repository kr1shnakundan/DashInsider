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

            const user = await User.create({
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

            users.push(user);

            // Progress indicator
            if ((i + 1) % 50 === 0) {
                console.log(`  ✓ Created ${i + 1} users...`);

            }
        }

        console.log(`✓ Created ${users.length} users`);

        console.log("seeding Subscriptions...");

        let subscriptionCount = 0;

        for(const user of users){
            const plan = plans[Math.floor(Math.random() * plans.length)];

            const statusChance = Math.random()

            let status = "Active";
            if(statusChance > 0.8) status = "Canceled";
            if(statusChance > 0.9) status = "Past_due";

            await Subscription.create({
                userId:user._id,
                subscriptionType:plan.name,
                status,
                startedDate:RandomDate(),
                renewalDate: status === "Active" 
                        ? dayjs().add(30, "day").toDate()
                        : null,
                cancellationDate: status === "Canceled" ? new Date() : null,
                monthlyPrice:plan.monthlyPrice,
            })

             subscriptionCount++;

            // Progress indicator
            if (subscriptionCount % 50 === 0) {
                console.log(`  ✓ Created ${subscriptionCount} subscriptions...`);
            }
            console.log(`✓ Created ${subscriptionCount} subscriptions`);

        }

        console.log("\n--- Summary ---");
        console.log(`Total Users: ${users.length}`);
        console.log(`Total Subscriptions: ${subscriptionCount}`);


        console.log("Seed complete 🌱");
        process.exit(0);
    } catch(error){
        console.log("Errror while seeding...:",error)
        process.exit(1)
    }
    
}

seed();