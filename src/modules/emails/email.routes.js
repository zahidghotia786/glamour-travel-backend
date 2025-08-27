// Add to your auth routes
import express from "express";
import { verifyEmail } from "./email.controller.js";
const router = express.Router();

router.get("/verify-email/:token", verifyEmail);

export default router;