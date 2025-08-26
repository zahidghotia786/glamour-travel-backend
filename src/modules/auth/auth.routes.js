import express from "express";
import { register, login, getProfile, updateProfile, forgotPassword, resetPassword } from "./auth.controller.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";


const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword); 
router.post("/reset-password", resetPassword);  


// Protected routes (require authentication)
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

export default router;
