// routes/complaintsRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  getUserComplaints,
  createComplaint,
  getComplaintDetails,
  addComplaintMessage,
  rateComplaint,
  getUserBookingsForComplaints
} from './complaintsController.js';
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

// Get user complaints
router.get('/', getUserComplaints);

// Get user bookings for complaint form
router.get('/bookings', getUserBookingsForComplaints);

// Get complaint details
router.get('/:id', getComplaintDetails);

// Create new complaint
router.post(
  '/',
  [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('category').isIn([
      'TOUR_QUALITY', 'TOUR_GUIDE', 'BOOKING_ISSUES', 'PAYMENT_ISSUES',
      'CANCELLATION', 'REFUND_REQUEST', 'TRANSPORTATION', 'FACILITY',
      'SAFETY', 'TICKET_REJECTION', 'OTHER'
    ]).withMessage('Valid category is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('contactEmail').isEmail().withMessage('Valid email is required'),
    body('contactPhone').notEmpty().withMessage('Phone number is required')
  ],
  createComplaint
);

// Add message to complaint
router.post(
  '/:id/messages',
  [
    body('message').notEmpty().withMessage('Message is required')
  ],
  addComplaintMessage
);

// Rate complaint resolution
router.post(
  '/:id/rate',
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1-5')
  ],
  rateComplaint
);

export default router;