import express from 'express';
import { body } from 'express-validator';
import {
  createPaymentSession,
  confirmPayment,
  handlePaymentWebhook,
  getPaymentStatus,
} from './payments.controller.js';
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth middleware to most routes
router.use(authenticateToken);

// Create payment session
router.post(
  "/create-session",
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('currency').isLength(3).withMessage('Currency is required'),
    body('paymentMethod').isIn(['ziina', 'card', 'bank']).withMessage('Valid payment method is required'),
  ],
  createPaymentSession
);

// Confirm payment
router.post(
  "/confirm",
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  ],
  confirmPayment
);

// Get payment status
router.get("/status/:paymentIntentId", getPaymentStatus);

// Webhook for payment notifications (no auth needed)
router.post("/webhook", express.raw({ type: 'application/json' }), handlePaymentWebhook);

export default router;