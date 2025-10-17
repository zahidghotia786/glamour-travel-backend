import express from 'express';
import PaymentTransaction from '../../models/PaymentTransaction.js';
import Booking from '../../models/booking.model.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import * as controller from "../bookings/bookings.controller.js";

const router = express.Router();

// Get user's payment transactions WITH COMPLETE BOOKING DETAILS
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const transactions = await PaymentTransaction.find({ userId })
      .populate({
        path: 'bookingId',
        select: 'reference clientReferenceNo passengerCount leadPassenger passengers tourDetails totalGross currency paymentStatus status raynaBookingId raynaStatus createdAt updatedAt', // ✅ All fields
        populate: {
          path: 'tourDetails', // ✅ If you have nested population
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    console.error("❌ Get payment transactions error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get payment transaction by ID WITH FULL DETAILS
router.get('/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const transaction = await PaymentTransaction.findOne({ 
      _id: id, 
      userId 
    }).populate({
      path: 'bookingId',
      select: 'reference clientReferenceNo passengerCount leadPassenger passengers tourDetails totalGross currency paymentStatus status raynaBookingId raynaStatus raynaBookingResponse createdAt updatedAt'
    });

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error("❌ Get transaction error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get payment statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const transactions = await PaymentTransaction.find({ userId });
    const completedPayments = transactions.filter(t => t.status === 'COMPLETED');
    const pendingPayments = transactions.filter(t => t.status === 'PENDING');
    
    const totalSpent = completedPayments.reduce((sum, t) => sum + t.amount, 0);
    const pendingAmount = pendingPayments.reduce((sum, t) => sum + t.amount, 0);

    const now = new Date();
    const thisMonth = completedPayments
      .filter(t => {
        const paymentDate = new Date(t.createdAt);
        return paymentDate.getMonth() === now.getMonth() && 
               paymentDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const lastMonth = completedPayments
      .filter(t => {
        const paymentDate = new Date(t.createdAt);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        return paymentDate.getMonth() === lastMonthDate.getMonth() && 
               paymentDate.getFullYear() === lastMonthDate.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        totalSpent,
        thisMonth,
        lastMonth,
        pendingAmount,
        completedPayments: completedPayments.length,
        averagePerBooking: completedPayments.length > 0 ? totalSpent / completedPayments.length : 0
      }
    });
  } catch (err) {
    console.error("❌ Get payment stats error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/payment-webhook', controller.handlePaymentWebhook);

export default router;