const express = require("express");
const app = express();




const dotenv = require("dotenv");
dotenv.config();
//  OR require("dontenv").config();

require("./jobs/applyDowngrade")
require("./jobs/handlePastDue")

const database = require("./config/database")

const cors = require("cors");
const cookieParser = require("cookie-parser")

const PORT = process.env.PORT || 4000;

app.use(
    cors({
        origin:"http://localhost:3000",
        credentials:true
    })
)

app.use(express.json());
app.use(cookieParser())

const userRoute = require("./routes/UserRoute");
const metriceRoute = require("./routes/MetriceRoute")
const subscriptionsRoute = require("./routes/SubscriptionRoute")
const auditLogRoute = require("./routes/AuditLogRoute")
const trendRoute = require("./routes/TrendRoute")
const cohortRoute = require("./routes/CohortRoute")
const segmentationRoute = require("./routes/SegmentationRoute")
const forecastingRoute = require("./routes/forecastingRoute")
const paymentRoute = require("./routes/PaymentRoute")
const inoviceRoute = require("./routes/InvoiceRoute")
const customerManagementRoute = require("./routes/CustomerManagementRoute")
const notificationRoute = require("./routes/NotificationRoute")
const planPricingRoute = require("./routes/PlanPricingRoute")

const { auditLog } = require("./middlewares/auditLogMiddleware")

app.use("/api/v1/auth",userRoute);
app.use("/api/v1/metrics",metriceRoute)
app.use("/api/v1/subscriptions", auditLog, subscriptionsRoute)
app.use("/api/v1/admin/audit-logs", auditLogRoute)
app.use("/api/v1/price", auditLog, planPricingRoute)
app.use("/api/v1/trends",trendRoute)
app.use("/api/v1/cohort",cohortRoute)
app.use("/api/v1/segmentation",segmentationRoute)
app.use("/api/v1/forecasting",forecastingRoute)
app.use("/api/v1/payment",paymentRoute)
app.use("/api/v1/invoices", inoviceRoute)
app.use("/api/v1/customers", customerManagementRoute)
app.use("/api/v1/notifications", auditLog, notificationRoute)

app.get("/",(req,res)=>{
    return res.json({
        success:true,
        message:`Server is on and running...`
    })
})

const startServer = async()=> {
    try{
        await database.connect();
        console.log("Database connected Successfully")
        app.listen(PORT ,()=>{
            console.log(`Server is running at port :${PORT}`);
        })
    } catch(error){
        console.log("Error occurred while connecting database...",error);
        process.exit(1);
    }
}

startServer();
