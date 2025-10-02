import { validationResult } from 'express-validator';
import axios from 'axios';
import prisma from "../../config/db.js";

export const createPaymentSession = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { bookingId, amount, currency = 'AED', paymentMethod = 'ziina' } = req.body;
    const userId = req.user.id;

    console.log('Creating payment session for booking:', { bookingId, amount, currency, paymentMethod });

    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: userId
      },
      include: {
        user: true
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found or access denied'
      });
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        error: 'Booking already paid'
      });
    }

    // Handle different payment methods
    let paymentResult;
    switch (paymentMethod) {
      case 'ziina':
        paymentResult = await createZiinaPaymentSession(booking, amount, currency);
        break;
      case 'card':
        paymentResult = await createCardPaymentSession(booking, amount, currency);
        break;
      case 'bank':
        paymentResult = await createBankTransferSession(booking, amount, currency);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported payment method'
        });
    }

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error
      });
    }

    // Update booking with payment intent ID
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentIntentId: paymentResult.paymentIntentId,
        paymentMethod: paymentMethod.toUpperCase(),
        paymentStatus: 'PENDING',
        paymentGateway: paymentResult.gateway,
        updatedAt: new Date(),
      },
    });

    // Create payment transaction record
    await prisma.paymentTransaction.create({
      data: {
        bookingId: bookingId,
        paymentIntentId: paymentResult.paymentIntentId,
        amount: amount,
        currency: currency,
        status: 'PENDING',
        gatewayResponse: paymentResult.rawResponse,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    res.json({
      success: true,
      paymentIntentId: paymentResult.paymentIntentId,
      paymentRedirectUrl: paymentResult.redirectUrl,
      gateway: paymentResult.gateway,
      message: 'Payment session created successfully'
    });

  } catch (error) {
    console.error('Payment session creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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
        success_url: `${process.env.FRONTEND_URL}/payment-success?bookingId=${booking.id}&paymentIntentId={payment_intent_id}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled?bookingId=${booking.id}`,
        failure_url: `${process.env.FRONTEND_URL}/payment-failed?bookingId=${booking.id}`,
        test: process.env.NODE_ENV === 'development',
        transaction_source: "directApi",
        expiry: String(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
        allow_tips: false,
        metadata: {
          bookingId: booking.id,
          userId: booking.userId,
          reference: booking.reference,
          tourType: getTourType(booking.apiResponse)
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ZIINA_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 10000
      }
    );

    if (!paymentIntent.data.redirect_url) {
      return { success: false, error: 'No redirect URL received from Ziina' };
    }

    return {
      success: true,
      paymentIntentId: paymentIntent.data.id,
      redirectUrl: paymentIntent.data.redirect_url,
      gateway: 'ZIINA',
      rawResponse: paymentIntent.data
    };

  } catch (error) {
    console.error('Ziina payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Ziina payment service unavailable'
    };
  }
}

// Card Payment Integration (Stripe-like, you can adapt to your preferred provider)
async function createCardPaymentSession(booking, amount, currency) {
  try {
    // For demo purposes - integrate with your actual card payment provider
    // This could be Stripe, Checkout.com, etc.
    
    const paymentData = {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      description: `Tour Booking - ${booking.reference}`,
      success_url: `${process.env.FRONTEND_URL}/payment-success?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled?bookingId=${booking.id}`,
      metadata: {
        booking_id: booking.id,
        user_id: booking.userId,
        reference: booking.reference
      }
    };

    // Example with a payment provider - replace with your actual implementation
    const paymentSession = {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: `${process.env.FRONTEND_URL}/card-payment?bookingId=${booking.id}` // Your card payment page
    };

    return {
      success: true,
      paymentIntentId: paymentSession.id,
      redirectUrl: paymentSession.url,
      gateway: 'CARD',
      rawResponse: paymentSession
    };

  } catch (error) {
    console.error('Card payment error:', error);
    return {
      success: false,
      error: 'Card payment service unavailable'
    };
  }
}

// Bank Transfer Integration
async function createBankTransferSession(booking, amount, currency) {
  try {
    // Generate bank transfer reference
    const transferReference = `BANK-${booking.reference}-${Date.now()}`;
    
    // Create bank transfer record
    const bankDetails = {
      bankName: process.env.BANK_NAME || 'Example Bank',
      accountName: process.env.BANK_ACCOUNT_NAME || 'Tour Company LLC',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '123456789',
      iban: process.env.BANK_IBAN || 'AE070331234567890123456',
      swiftCode: process.env.BANK_SWIFT || 'EXBLAEAD',
      reference: transferReference,
      amount: amount,
      currency: currency,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
    };

    // Update booking with bank transfer details
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        gatewayReference: transferReference,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      paymentIntentId: transferReference,
      redirectUrl: `${process.env.FRONTEND_URL}/bank-transfer?bookingId=${booking.id}&reference=${transferReference}`,
      gateway: 'BANK_TRANSFER',
      rawResponse: bankDetails,
      bankDetails: bankDetails
    };

  } catch (error) {
    console.error('Bank transfer error:', error);
    return {
      success: false,
      error: 'Bank transfer service unavailable'
    };
  }
}

// Confirm Payment
export const confirmPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { bookingId, paymentIntentId } = req.body;
    const userId = req.user.id;

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: userId
      },
      include: {
        user: true
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if already paid
    if (booking.paymentStatus === 'PAID') {
      return res.json({
        success: true,
        alreadyPaid: true,
        message: 'Payment already confirmed'
      });
    }

    // Verify payment based on payment method
    let paymentVerified = false;
    
    switch (booking.paymentMethod) {
      case 'ZIINA':
        paymentVerified = await verifyZiinaPayment(paymentIntentId);
        break;
      case 'CARD':
        paymentVerified = await verifyCardPayment(paymentIntentId);
        break;
      case 'BANK':
        paymentVerified = await verifyBankTransfer(paymentIntentId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unknown payment method'
        });
    }

    if (!paymentVerified) {
      return res.status(400).json({
        success: false,
        error: 'Payment not verified or still processing'
      });
    }

    // Update booking and process successful payment
    const result = await processSuccessfulPayment(booking);

    res.json({
      success: true,
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: 'CONFIRMED',
        paymentStatus: 'PAID'
      },
      message: 'Payment confirmed successfully'
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment confirmation failed'
    });
  }
};

// Verify Ziina Payment
async function verifyZiinaPayment(paymentIntentId) {
  try {
    const response = await axios.get(
      `https://api-v2.ziina.com/api/payment_intent/${paymentIntentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ZIINA_API_TOKEN}`,
        },
      }
    );

    return response.data.status === 'succeeded';
  } catch (error) {
    console.error('Ziina payment verification error:', error);
    return false;
  }
}

// Verify Card Payment
async function verifyCardPayment(paymentIntentId) {
  // Implement based on your card payment provider
  // This is a placeholder - replace with actual implementation
  return true; // For demo purposes
}

// Verify Bank Transfer
async function verifyBankTransfer(reference) {
  // Implement bank transfer verification logic
  // This could involve checking against your bank statements
  // or manual verification process
  return true; // For demo purposes - manual verification needed
}

// Process Successful Payment
async function processSuccessfulPayment(booking) {
  try {
    // Update booking status
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        gatewayReference: booking.paymentIntentId,
        updatedAt: new Date(),
      },
    });

    // Update payment transaction
    await prisma.paymentTransaction.updateMany({
      where: {
        paymentIntentId: booking.paymentIntentId
      },
      data: {
        status: 'PAID',
        updatedAt: new Date(),
      },
    });

    // Create billing record
    await prisma.billingRecord.create({
      data: {
        userId: booking.userId,
        bookingId: booking.id,
        planName: getTourType(booking.apiResponse),
        duration: calculateTourDuration(booking),
        price: booking.totalGross,
        paymentSessionId: booking.paymentIntentId,
        purchasedAt: new Date()
      }
    });

    // Send confirmation email
    await sendBookingConfirmationEmail(booking);

    // Generate ticket/voucher if needed
    await generateTicket(booking);

    console.log(`✅ Payment processed successfully for booking: ${booking.reference}`);

    return { success: true };

  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
}

// Webhook Handler for Payment Notifications
export const handlePaymentWebhook = async (req, res) => {
  try {
    const event = req.body;
    const signature = req.headers['ziina-signature'];

    // Verify webhook signature (implement based on Ziina's documentation)
    // if (!verifyWebhookSignature(signature, event)) {
    //   return res.status(400).send('Invalid signature');
    // }

    console.log('Received payment webhook:', event.type);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { bookingId } = paymentIntent.metadata;

      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { user: true }
        });

        if (booking && booking.paymentStatus !== 'PAID') {
          await processSuccessfulPayment(booking);
          console.log(`🎯 Webhook: Payment auto-confirmed for booking: ${booking.reference}`);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Get Payment Status
export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { paymentIntentId },
      include: {
        booking: {
          select: {
            reference: true,
            status: true,
            paymentStatus: true,
            totalGross: true,
            currency: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Payment transaction not found'
      });
    }

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        paymentIntentId: transaction.paymentIntentId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        createdAt: transaction.createdAt
      },
      booking: transaction.booking
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status'
    });
  }
};

// Helper Functions
function getTourType(apiResponse) {
  if (!apiResponse) return "Tour Booking";
  if (apiResponse.error?.includes("6 Emirates")) return "6 Emirates in a Day Tour with Lunch";
  if (apiResponse.result?.details?.[0]?.servicetype) return apiResponse.result.details[0].servicetype;
  return "Tour Booking";
}

function calculateTourDuration(booking) {
  // Implement based on your tour data
  return 1; // Default 1 day
}

async function sendBookingConfirmationEmail(booking) {
  try {
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .ticket { border: 2px dashed #4F46E5; padding: 15px; margin: 15px 0; background: #f8f9fa; }
          .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; }
          .success { color: #10B981; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Tour Booking Confirmed!</h1>
        </div>
        <div class="content">
          <h2>Hello ${booking.leadPassenger?.firstName || 'Guest'},</h2>
          <p>Your tour booking has been confirmed and payment received successfully!</p>
          
          <div class="ticket">
            <h3>📋 Booking Details</h3>
            <p><strong>Reference Number:</strong> ${booking.reference}</p>
            <p><strong>Tour:</strong> ${getTourType(booking.apiResponse)}</p>
            <p><strong>Passengers:</strong> ${booking.passengerCount}</p>
            <p><strong>Total Paid:</strong> ${booking.currency} ${booking.totalGross}</p>
            <p><strong>Status:</strong> <span class="success">Confirmed & Paid ✅</span></p>
            <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
          </div>

          <p>You will receive another email with your tour voucher and detailed instructions shortly.</p>
        </div>
        <div class="footer">
          <p>Thank you for booking with us!</p>
          <p>Need help? Contact our support team.</p>
        </div>
      </body>
      </html>
    `;

    // Implement your email service here
    console.log("📧 Confirmation email would be sent for booking:", booking.reference);
    
    // Example email service call:
    // await sendEmail({
    //   to: booking.user.email,
    //   subject: `✅ Tour Booking Confirmed - ${booking.reference}`,
    //   html: emailContent,
    // });

  } catch (error) {
    console.error("Email sending error:", error);
  }
}

async function generateTicket(booking) {
  // Implement ticket/voucher generation logic
  console.log("🎫 Ticket generated for booking:", booking.reference);
}

export default {
  createPaymentSession,
  confirmPayment,
  handlePaymentWebhook,
  getPaymentStatus
};