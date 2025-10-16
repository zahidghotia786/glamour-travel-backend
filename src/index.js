import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import { connectDB } from "./config/db.js"; // ✅ DB connect hote hi check hoga


dotenv.config();
const app = express();
await connectDB();

// ✅ Allowed Origins
const allowedOrigins = [
  "https://glamour-travel.vercel.app", // frontend (Vercel)
  "http://localhost:3000",             // local dev
];

// ✅ CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Handle Preflight requests

app.use(express.json());

app.use("/tours", express.static(path.resolve("public/tours")));


// cron job 

startTourSyncCron();

import authRoutes from "./modules/auth/auth.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import emailRoutes from "./modules/emails/email.routes.js"
import productsRoutes from "./modules/products/products.routes.js";
import publicProductsRoutes from "./modules/products/products.routes.js";
import b2bRoutes from "./modules/b2b/b2b.routes.js";
// import adminBookingsRoutes from "./modules/bookings/bookings.routes.js";
import usersRoutes from "./modules/users/users.routes.js"
import categoryRoutes from "./modules/categories/categories.routes.js"
import bookingRoutes from './modules/bookings/bookings.routes.js'
import paymentRoutes from "./modules/payments/payments.routes.js"
import complaintRoutes from './modules/complaint/complaintsRoutes.js'


// new route db tickets 

import tourTicketsRoutes from './modules/tour/tour.routes.js'


import { errorHandler } from "./middleware/errorHandler.js";
import { startTourSyncCron } from "./cron/cron.jobs.js";

// Routes
app.use("/api/auth", authRoutes);


  /////  admin controll  /////

app.use("/api/email", emailRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/products", productsRoutes);
app.use("/api/admin/b2b", b2bRoutes);
// app.use("/api/admin/bookings", adminBookingsRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/tourtickets", tourTicketsRoutes);

  /////  admin controll  /////


app.use("/api/products", publicProductsRoutes);
app.use('/api/categories', categoryRoutes);




// Health Check
app.get("/", (req, res) => {
  res.send("✅ Tourism Portal Backend API running 🚀");
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    console.log(`🚀 Server running on port ${PORT}`);
  } catch (err) {
    console.error("❌ Error connecting to DB:", err);
    process.exit(1);
  }
});
