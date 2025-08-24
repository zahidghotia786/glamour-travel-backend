import express from "express";
import { register, login } from "./auth.controller.js";

const router = express.Router();

// Customer registration
router.post("/register", register);

// Common login (Customer, B2B, Admin)
router.post("/login", login);

export default router;
