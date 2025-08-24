import { Router } from "express";
import { verifyToken, requireRoles } from "../../middleware/authMiddleware.js";
import { getAdminSummary } from "./admin.controller.js";

const router = Router();

// everything under /api/admin requires ADMIN
router.use(verifyToken, requireRoles("ADMIN"));

router.get("/summary", getAdminSummary);
// router.get("/users", ...)
// router.get("/bookings", ...)
// router.post("/products", ...)

export default router;
