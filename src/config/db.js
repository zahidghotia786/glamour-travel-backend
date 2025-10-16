// src/config/db.js
import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("❌ DATABASE_URL is not defined in environment variables");
  }

  try {
    mongoose.set("strictQuery", false); // optional but recommended for mongoose 7+
    await mongoose.connect(uri, {
      // useNewUrlParser & useUnifiedTopology already default in mongoose >=6
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

export default mongoose;
