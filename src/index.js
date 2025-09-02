import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import prisma from "./config/db.js"; // ✅ DB connect hote hi check hoga


dotenv.config();
const app = express();

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


import authRoutes from "./modules/auth/auth.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import emailRoutes from "./modules/emails/email.routes.js"
import productsRoutes from "./modules/products/products.routes.js";
import b2bRoutes from "./modules/b2b/b2b.routes.js";
import adminBookingsRoutes from "./modules/bookings/bookings.routes.js";
import usersRoutes from "./modules/users/users.routes.js"
import categoryRoutes from "./modules/categories/categories.routes.js"


import { errorHandler } from "./middleware/errorHandler.js";

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/products", productsRoutes);
app.use("/api/admin/b2b", b2bRoutes);
app.use("/api/admin/bookings", adminBookingsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin/categories", categoryRoutes);


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
