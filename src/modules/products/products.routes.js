import { Router } from "express";
import * as controller from "./products.controller.js";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";

const router = Router();

router.get("/", authenticateToken, requireRole("ADMIN"), controller.list);
router.get("/:id", authenticateToken, requireRole("ADMIN"), controller.getById);
router.post("/", authenticateToken, requireRole("ADMIN"), controller.create);
router.put("/:id", authenticateToken, requireRole("ADMIN"), controller.update);
router.delete("/:id", authenticateToken, requireRole("ADMIN"), controller.remove);

export default router;
