import express from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import usersController from './users.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// User profile routes
router.get('/profile', usersController.getProfile);
router.patch('/profile', requireRole(['ADMIN', 'B2B']), usersController.updateProfile);

// User bookings routes
router.get('/bookings', usersController.getUserBookings);

// Admin specific routes
router.get('/admin/profile', requireRole(['ADMIN']), usersController.getProfile);
router.patch('/admin/profile', requireRole(['ADMIN']), usersController.updateAdminProfile);

router.get('/admin/settings', requireRole(['ADMIN']), usersController.getAdminSettings);
router.patch('/admin/settings', requireRole(['ADMIN']), usersController.updateAdminSettings);

export default router;
