import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import prisma from "./config/db.js"; // ✅ DB connect hote hi check hoga
import authRoutes from "./modules/auth/auth.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";


// import userRoutes from "./modules/users/users.routes.js";
// import bookingRoutes from "./modules/bookings/bookings.routes.js";
// import ticketRoutes from "./modules/tickets/tickets.routes.js";
// import productRoutes from "./modules/products/products.routes.js";
// import paymentRoutes from "./modules/payments/payments.routes.js";
// import b2bRoutes from "./modules/b2b/b2b.routes.js";


import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// app.use("/api/users", userRoutes);
// app.use("/api/bookings", bookingRoutes);
// app.use("/api/tickets", ticketRoutes);
// app.use("/api/products", productRoutes);
// app.use("/api/payments", paymentRoutes);
// app.use("/api/b2b", b2bRoutes);

// Health Check
app.get("/", (req, res) => {
  res.send("✅ Tourism Portal Backend API running 🚀");
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await prisma.$connect(); // ✅ DB connection check
    console.log("✅ MongoDB connected via Prisma");
    console.log(`🚀 Server running on port ${PORT}`);
  } catch (err) {
    console.error("❌ Error connecting to DB:", err);
    process.exit(1);
  }
});
