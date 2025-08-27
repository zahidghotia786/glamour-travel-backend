import { Router } from "express";
import * as controller from "./bookings.controller.js";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";

const router = Router();

router.get("/", authenticateToken, requireRole("ADMIN"), controller.adminList);
router.patch("/:id/cancel", authenticateToken, requireRole("ADMIN"), controller.adminCancel);

export default router;
