import { Router } from "express";
import {  authenticateToken, requireRole } from "../../middleware/authMiddleware.js";
import b2bController, * as controller from "./b2b.controller.js";

const router = Router();

// Markup routes - ADMIN only
router.get("/markup", authenticateToken, requireRole(['ADMIN']),controller.listMarkups);

router.post("/markup", authenticateToken, requireRole(['ADMIN']), controller.createOrUpdateMarkup);

router.delete("/markup/:id", authenticateToken, requireRole(['ADMIN']), controller.deleteMarkup);

// B2B user routes - ADMIN and ACCOUNT_MANAGER
router.post("/users", authenticateToken, requireRole(['ADMIN', 'ACCOUNT_MANAGER']),b2bController.createB2BUser);

router.get("/users", authenticateToken, requireRole(['ADMIN', 'ACCOUNT_MANAGER']),b2bController.getB2BUsers);

export default router;