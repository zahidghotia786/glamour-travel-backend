import { Router } from "express";
import * as controller from "./bookings.controller.js";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";
import { body } from "express-validator";

const router = Router();

router.get("/", authenticateToken, requireRole("ADMIN"), controller.adminList);
router.patch("/:id/cancel", authenticateToken, requireRole("ADMIN"), controller.adminCancel);


router.post(
  "/create-with-payment", authenticateToken,
  [
    body('passengerCount').isInt({ min: 1 }).withMessage('Valid passenger count is required'),
    body('leadPassenger').isObject().withMessage('Lead passenger details are required'),
    body('totalGross').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
    body('paymentMethod').isIn(['ziina', 'card', 'bank']).withMessage('Valid payment method is required'),
  ],
  controller.createBookingWithPayment
);


// Tour Booking routes
router.post('/bookings', authenticateToken,  controller.createBooking);
router.post('/tickets', controller.getBookedTickets);
router.post('/cancel', controller.cancelBooking);


// routes/bookings.js
router.get('/my-bookings', authenticateToken, controller.getUserBookings);

export default router;
