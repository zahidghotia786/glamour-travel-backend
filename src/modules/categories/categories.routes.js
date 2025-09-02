// backend/src/modules/categories/categories.routes.js
import express from "express";
import categoryController from "./categories.controller.js";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/public", categoryController.getCategories);
router.get("/public/:id", categoryController.getCategoryById);

// Protected
router.use(authenticateToken);
router.use(requireRole("ADMIN"));

router.get("/", categoryController.getCategories);
router.get("/stats", categoryController.getCategoryStats);
router.get("/:id", categoryController.getCategoryById);
router.post("/", categoryController.createCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);
router.patch("/reorder", categoryController.updateDisplayOrder);

export default router;   // <-- ✅ ES Module export
