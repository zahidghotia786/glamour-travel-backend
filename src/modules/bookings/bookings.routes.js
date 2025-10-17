import { Router } from "express";
import * as controller from "./bookings.controller.js";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";
import { body, param } from "express-validator";

const router = Router();

// Sirf yeh route chahiye abhi
router.post(
  "/create-with-payment", 
  authenticateToken,
  [
    body('uniqueNo').notEmpty().withMessage('Unique number is required'),
    body('TourDetails').isArray({ min: 1 }).withMessage('Tour details are required'),
    body('passengers').isArray({ min: 1 }).withMessage('Passengers are required'),
    body('clientReferenceNo').notEmpty().withMessage('Client reference is required'),
    body('paymentMethod').isIn(['ziina']).withMessage('Only Ziina payment is supported'),
  ],
  controller.createBookingWithPayment
);

// Payment status check ke liye
router.get('/verify-payment/:bookingId', authenticateToken, controller.getPaymentStatus);

// Webhook for payment notifications
router.post('/payment-webhook', controller.handlePaymentWebhook);


// Cancel Booking
router.post("/cancel/:bookingId", authenticateToken, controller.cancelBooking);

// Get Merged Booked Tickets
router.get(
  "/tickets/:bookingId",
  [
    param("bookingId")
      .notEmpty().withMessage("Booking ID is required")
      .isMongoId().withMessage("Invalid Booking ID"),
  ],
  controller.getMergedTickets
);



// Admin: Get all bookings
router.get("/all", authenticateToken , requireRole("ADMIN"), controller.getAllBookings);

// User: Get bookings by user ID
router.get('/my-bookings', authenticateToken, controller.getBookingsByUser);

export default router;