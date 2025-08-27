import { Router } from "express";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";
import * as controller from "./b2b.controller.js";

const router = Router();

router.get("/markup", authenticateToken, requireRole("ADMIN"), controller.listMarkups);
router.post("/markup", authenticateToken, requireRole("ADMIN"), controller.createOrUpdateMarkup);
router.delete("/markup/:id", authenticateToken, requireRole("ADMIN"), controller.deleteMarkup);

export default router;
