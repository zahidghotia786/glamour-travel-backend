import { Router } from "express";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";
import { 
  getAdminSummary, 
  allUsers, 
  updateUserStatus, 
  updateUserRole, 
  deleteUser, 
  getUserDetails,
  assignAccountManager,
  getUsersByManager,
} from "./admin.controller.js";

const router = Router();

// Everything under /api/admin requires ADMIN role
router.use(authenticateToken, requireRole("ADMIN"));

// Dashboard summary
router.get("/summary", getAdminSummary);

// User management routes
router.get("/users", allUsers);
router.get("/users/:userId", getUserDetails);
router.patch("/users/:userId/status", updateUserStatus);
router.patch("/users/:userId/role", updateUserRole);
router.delete("/users/:userId", deleteUser);
router.patch("/users/:userId/assign-manager", assignAccountManager);
router.get("/managers/:managerId/users", getUsersByManager);
// Backend route for updating B2B users




export default router;