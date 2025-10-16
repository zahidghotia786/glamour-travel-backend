import express from "express";
import { cancelApproval, checkDubaiTourAvailability, getApprovedDubaiToursForPublic, getDubaiTourDetails, getDubaiTourOptions, getDubaiTours, toggleApproval } from "./tour.controller.js";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Admin-only route
router.get("/dubai-tours", authenticateToken, requireRole('ADMIN'), getDubaiTours);
router.post('/approve', authenticateToken, requireRole('ADMIN'), toggleApproval);
router.post('/cancel-approval', authenticateToken, requireRole('ADMIN'), cancelApproval);

router.get("/public/dubai-tours", getApprovedDubaiToursForPublic);
router.post("/dubai/tour-details", getDubaiTourDetails);
router.post("/dubai/tour-options", getDubaiTourOptions);
router.post("/dubai/availability", checkDubaiTourAvailability);

export default router;
