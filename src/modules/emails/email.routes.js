// Add to your auth routes
import express from "express";
import { verifyEmail, resendVerification } from "./email.controller.js";
const router = express.Router();

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

export default router;