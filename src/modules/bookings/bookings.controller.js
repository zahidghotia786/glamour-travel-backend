import { validationResult } from "express-validator";
import axios from "axios";
import Booking from "../../models/booking.model.js";
import PaymentTransaction from "../../models/PaymentTransaction.js";
import { cancelBookingOnRayna, getMergedBookedTickets, sendBookingToRayna } from "./raynaBooking.service.js";

export const createBookingWithPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const {
      uniqueNo,
      TourDetails,
      passengers,
      clientReferenceNo,
      paymentMethod,
      totalGross,
      passengerCount,
      leadPassenger,
    } = req.body;

    const userId = req.user.id;

    console.log("🔄 Creating booking with payment session...", {
      uniqueNo,
      passengerCount,
      paymentMethod,
      userId // Log userId for debugging
    });

    // Step 1: Check for existing booking with the same reference
    let booking = await Booking.findOne({ reference: uniqueNo });

    if (booking) {
      // Booking exists, check status
      if (booking.paymentStatus === "PAID" || booking.status === "CONFIRMED") {
        return res.status(400).json({
          success: false,
          error: "Booking with this reference is already completed.",
        });
      } else {
        // Booking exists but not completed, update it
        booking.userId = userId;
        booking.clientReferenceNo = clientReferenceNo;
        booking.passengerCount = passengerCount;
        booking.leadPassenger = leadPassenger;
        booking.passengers = passengers;
        booking.tourDetails = TourDetails;
        booking.totalGross = totalGross;
        booking.paymentMethod = paymentMethod.toUpperCase();
        booking.paymentStatus = "PENDING";
        booking.status = "AWAITING_PAYMENT";
        booking.providerStatus = "NOT_SUBMITTED";
        booking.updatedAt = new Date();

        await booking.save();
        console.log("🔄 Reusing existing booking:", booking._id);
      }
    } else {
      // Booking doesn't exist, create a new one
      booking = new Booking({
        userId: userId,
        reference: uniqueNo,
        clientReferenceNo: clientReferenceNo,
        passengerCount: passengerCount,
        leadPassenger: leadPassenger,
        passengers: passengers,
        tourDetails: TourDetails,
        totalGross: totalGross,
        currency: "AED",
        paymentMethod: paymentMethod.toUpperCase(),
        paymentStatus: "PENDING",
        status: "AWAITING_PAYMENT",
        providerStatus: "NOT_SUBMITTED",
      });

      await booking.save();
      console.log("✅ New booking created:", booking._id);
    }

    const savedBooking = await booking.save();
    console.log("✅ Booking created in MongoDB:", savedBooking._id);

    // Step 2: Create Ziina Payment Session
    const paymentResult = await createZiinaPaymentSession(
      savedBooking,
      totalGross,
      "AED"
    );

    if (!paymentResult.success) {
      // Mark booking as failed
      await Booking.findByIdAndUpdate(savedBooking._id, {
        paymentStatus: "FAILED",
        status: "FAILED",
        updatedAt: new Date(),
      });

      return res.status(400).json({
        statuscode: 400,
        error: paymentResult.error,
        result: [],
      });
    }

    // Step 3: Update booking with payment details
    await Booking.findByIdAndUpdate(savedBooking._id, {
      paymentIntentId: paymentResult.paymentIntentId,
      paymentGateway: paymentResult.gateway,
      updatedAt: new Date(),
    });

    // Step 4: Create payment transaction record WITH userId
    const paymentTransaction = new PaymentTransaction({
      bookingId: savedBooking._id,
      userId: userId, // ✅ ADD THIS LINE - This is crucial for the payments page
      paymentIntentId: paymentResult.paymentIntentId,
      amount: totalGross,
      currency: "AED",
      status: "PENDING",
      gatewayResponse: paymentResult.rawResponse,
      gateway: paymentResult.gateway,
      type: "PAYMENT", // ✅ Also add type for better organization
    });

    await paymentTransaction.save();

    console.log("✅ Payment session created:", paymentResult.paymentIntentId);
    console.log("✅ Payment transaction created for user:", userId);

    // Step 5: Return response with redirect URL
    res.json({
      statuscode: 200,
      result: {
        booking: {
          id: savedBooking._id,
          reference: savedBooking.reference,
          status: savedBooking.status,
          paymentStatus: savedBooking.paymentStatus,
          providerStatus: savedBooking.providerStatus,
        },
        payment: {
          paymentIntentId: paymentResult.paymentIntentId,
          paymentRedirectUrl: paymentResult.redirectUrl,
          gateway: paymentResult.gateway,
        },
      },
      message: "Booking created successfully. Redirect to complete payment.",
    });
  } catch (error) {
    console.error("❌ Create booking with payment error:", error);
    res.status(500).json({
      statuscode: 500,
      error: "Internal server error",
    });
  }
};

// Ziina Payment Integration
async function createZiinaPaymentSession(booking, amount, currency) {
  try {
    const paymentIntent = await axios.post(
      "https://api-v2.ziina.com/api/payment_intent",
      {
        amount: Math.round(amount * 100), // Convert to fils
        currency_code: currency,
        message: `Payment for tour booking - Ref: ${booking.reference}`,
        success_url: `${process.env.FRONTEND_URL}/payment-success?bookingId=${booking._id}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled?bookingId=${booking._id}`,
        failure_url: `${process.env.FRONTEND_URL}/payment-failed?bookingId=${booking._id}`,
        test: true, // Use test mode for development
        transaction_source: "directApi",
        expiry: String(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
        allow_tips: false,
        metadata: {
          bookingId: booking._id.toString(),
          userId: booking.userId.toString(),
          reference: booking.reference,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ZIINA_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    if (!paymentIntent.data.redirect_url) {
      return { success: false, error: "No redirect URL received from Ziina" };
    }

    return {
      success: true,
      paymentIntentId: paymentIntent.data.id,
      redirectUrl: paymentIntent.data.redirect_url,
      gateway: "ZIINA",
      rawResponse: paymentIntent.data,
    };
  } catch (error) {
    console.error(
      "❌ Ziina payment error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error:
        error.response?.data?.message || "Ziina payment service unavailable",
    };
  }
}

// Webhook Handler for Payment Notifications
export const handlePaymentWebhook = async (req, res) => {
  try {
    const event = req.body;
    console.log("🔄 Received payment webhook:", event.type);

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const { bookingId } = paymentIntent.metadata;

      if (bookingId) {
        const booking = await Booking.findById(bookingId);

        if (booking && booking.paymentStatus !== "PAID") {
          await processSuccessfulPayment(booking, paymentIntent.id);
          console.log(
            `✅ Webhook: Payment confirmed for booking: ${booking.reference}`
          );
        }
      }
    } else if (event.type === "payment_intent.cancelled") {
      const paymentIntent = event.data.object;
      const { bookingId } = paymentIntent.metadata;

      if (bookingId) {
        await Booking.findByIdAndUpdate(bookingId, {
          paymentStatus: "CANCELLED",
          status: "CANCELLED",
          updatedAt: new Date(),
        });

        await PaymentTransaction.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          {
            status: "CANCELLED",
            updatedAt: new Date(),
          }
        );

        console.log(`❌ Webhook: Payment cancelled for booking: ${bookingId}`);
      }
    } else if (event.type === "payment_intent.failed") {
      const paymentIntent = event.data.object;
      const { bookingId } = paymentIntent.metadata;

      if (bookingId) {
        await Booking.findByIdAndUpdate(bookingId, {
          paymentStatus: "FAILED",
          status: "FAILED",
          updatedAt: new Date(),
        });

        await PaymentTransaction.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          {
            status: "FAILED",
            updatedAt: new Date(),
          }
        );

        console.log(`❌ Webhook: Payment failed for booking: ${bookingId}`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

// Process successful payment: update booking, transaction, and send to Rayna

async function processSuccessfulPayment(booking, paymentIntentId) {
  try {
    // 1️⃣ Update booking and payment transaction status
    await Booking.findByIdAndUpdate(booking._id, {
      paymentStatus: "PAID",
      status: "CONFIRMED",
      gatewayReference: paymentIntentId,
      updatedAt: new Date(),
    });

    await PaymentTransaction.findOneAndUpdate(
      { paymentIntentId },
      { status: "PAID", updatedAt: new Date() }
    );

    console.log(`✅ Payment processed successfully for booking: ${booking.reference}`);

    // 2️⃣ Send booking to Rayna API
    try {
      const raynaResponse = await sendBookingToRayna(booking);
      console.log(`✅ Booking sent to Rayna successfully: ${booking.reference}`);
    } catch (raynaErr) {
      console.error(`❌ Rayna booking failed for ${booking.reference}:`, raynaErr.message);
      // Rayna failure is already recorded inside sendBookingToRayna
    }

  } catch (error) {
    console.error("❌ Payment processing error:", error);
    throw error;
  }
}


// Get Payment Status
export const getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.paymentIntentId) {
      return res.status(404).json({
        success: false,
        error: "Booking not found or missing paymentIntentId",
      });
    }

    const transaction = await PaymentTransaction.findOne({
      paymentIntentId: booking.paymentIntentId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Payment transaction not found",
      });
    }

    res.json({
      success: true,
      transaction,
      booking,
    });
  } catch (error) {
    console.error("❌ verifyPaymentByBooking error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};








// Cancel Booking Controller
export const cancelBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { bookingId } = req.body;

    const result = await cancelBookingOnRayna({ _id: bookingId });
    res.json({
      success: true,
      message: "Booking cancelled successfully",
      raynaResponse: result,
    });
  } catch (err) {
    console.error("❌ Cancel booking error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Merged Booked Tickets Controller
export const getMergedTickets = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const mergedData = await getMergedBookedTickets(bookingId);
    res.json({
      success: true,
      mergedData,
    });
  } catch (err) {
    console.error("❌ Get merged booked tickets error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};




// Admin: Get all bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    console.error("❌ Get all bookings error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};



// User: Get bookings by user ID
export const getBookingsByUser = async (req, res) => {
  try {
    // Get userId from authenticated user, not from params
    const userId = req.user.id; // Assuming your auth middleware sets req.user
    
    const bookings = await Booking.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings, // Changed from 'bookings' to 'data' to match frontend expectation
    });
  } catch (err) {
    console.error("❌ Get bookings by user error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
