import { Router } from "express";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";
import { getAdminSummary, allUsers } from "./admin.controller.js";

const router = Router();

// everything under /api/admin requires ADMIN
router.use(authenticateToken, requireRole("ADMIN"));

router.get("/summary", getAdminSummary);
router.get("/users", allUsers)
// router.get("/bookings", ...)
// router.post("/products", ...)

export default router;
