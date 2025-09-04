import { Router } from "express";
import * as controller from "./products.controller.js";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";

const router = Router();

// Public routes
router.get('/public', controller.getProductsPublic); 
router.get('/public/category/:categoryId', controller.getProductsByCategory);
router.get('/public/featured', controller.getFeaturedProducts);
router.get('/public/:id', controller.getProductById);

// Protected routes (admin only)
router.get("/", authenticateToken, requireRole("ADMIN"), controller.list);
router.get("/:id", authenticateToken, requireRole("ADMIN"), controller.getById);
router.post("/", authenticateToken, requireRole("ADMIN"), controller.create);
router.put("/:id", authenticateToken, requireRole("ADMIN"), controller.update);
router.delete("/:id", authenticateToken, requireRole("ADMIN"), controller.remove);

export default router;