import axios from "axios";
import prisma from "../../config/db.js";
import { createPaymentSession } from "../payments/payments.controller.js";
import { cancelBookings, createBookingTicket, getBookedTicketsList } from "../tickets/tickets.service.js";

export const createBooking = async (req, res) => {
  try {
    const bookingData = req.body;
    const userId = req.user.id;
    
    // Step 1: Create booking with external API
    const result = await createBookingTicket(bookingData, userId);

    // Step 2: If booking is successful, automatically create payment session
    if (result.statuscode === 200 && result.result) {
      try {
        // Get the booking ID from the result
        const bookingId = result.result.bookingId || result.result[0]?.bookingId;
        
        if (bookingId) {
          // Calculate total amount
          const totalAmount = calculateTotalFromBooking(bookingData);
          
          // Auto-create payment session
          const paymentSession = await createPaymentSession({
            body: {
              bookingId: bookingId,
              amount: totalAmount,
              currency: 'AED',
              paymentMethod: bookingData.paymentMethod || 'ziina'
            },
            user: { id: userId }
          }, res); // Pass res to handle response

          // If payment session created successfully, return both booking and payment info
          if (paymentSession && paymentSession.success) {
            return res.status(200).json({
              statuscode: 200,
              error: null,
              result: {
                booking: result.result,
                payment: {
                  paymentIntentId: paymentSession.paymentIntentId,
                  paymentRedirectUrl: paymentSession.paymentRedirectUrl,
                  message: "Booking created successfully. Redirect to complete payment."
                }
              }
            });
          }
        }
      } catch (paymentError) {
        console.error("Payment session creation failed:", paymentError);
        // Continue with booking success even if payment fails
        // User can pay later from their bookings
      }
    }

    // Return just booking result if payment integration fails or not needed
    return res.status(200).json({
      statuscode: 200,
      error: null,
      result: result.result
    });

  } catch (error) {
    console.error("Booking creation error:", error);
    
    let statusCode = 500;
    let errorMessage = error.message || "Internal server error";
    
    if (error.message.includes('Child are not allowed') || 
        error.message.includes('validation') ||
        error.message.includes('required') ||
        error.message.includes('missing')) {
      statusCode = 400;
    } else if (error.message.includes('unauthorized') || 
               error.message.includes('token') ||
               error.message.includes('authentication')) {
      statusCode = 401;
    } else if (error.message.includes('External API') || 
               error.message.includes('network') ||
               error.message.includes('timeout')) {
      statusCode = 502;
    }

    return res.status(statusCode).json({
      statuscode: statusCode,
      error: errorMessage,
      result: []
    });
  }
};

// 🆕 Helper function to calculate total from booking data
function calculateTotalFromBooking(bookingData) {
  if (!bookingData.TourDetails || !bookingData.TourDetails[0]) return 0;
  
  const tourDetail = bookingData.TourDetails[0];
  const adultTotal = (tourDetail.adult || 0) * (parseFloat(tourDetail.adultRate) || 0);
  const childTotal = (tourDetail.child || 0) * (parseFloat(tourDetail.childRate) || 0);
  
  return adultTotal + childTotal;
}

// 🆕 Enhanced booking creation that integrates with payment
export const createBookingWithPayment = async (req, res) => {
  try {
    const bookingData = req.body;
    const userId = req.user.id;

    console.log('Creating booking with payment integration...');

    // Validate required fields for payment
    if (!bookingData.paymentMethod) {
      return res.status(400).json({
        statuscode: 400,
        error: "Payment method is required",
        result: []
      });
    }

    // Create booking first
    const bookingResult = await createBookingTicket(bookingData, userId);

    if (bookingResult.statuscode !== 200 || !bookingResult.result) {
      return res.status(400).json({
        statuscode: 400,
        error: bookingResult.error || "Booking creation failed",
        result: []
      });
    }

    // Extract booking reference and ID
    const bookingReference = bookingResult.result.referenceNo || bookingResult.result[0]?.refernceNo;
    let bookingId;

    // Find the booking in database to get its ID
    if (bookingReference) {
      const dbBooking = await prisma.booking.findUnique({
        where: { reference: bookingReference }
      });
      bookingId = dbBooking?.id;
    }

    if (!bookingId) {
      // If we can't find booking ID, return success but without payment
      return res.status(200).json({
        statuscode: 200,
        error: null,
        result: {
          booking: bookingResult.result,
          message: "Booking created successfully. Please complete payment from your bookings page."
        }
      });
    }

    // Calculate total amount
    const totalAmount = calculateTotalFromBooking(bookingData);

    // Create payment session
    const paymentResult = await createPaymentSessionDirect({
      bookingId,
      amount: totalAmount,
      currency: 'AED',
      paymentMethod: bookingData.paymentMethod
    }, userId);

    if (!paymentResult.success) {
      // Return booking success but payment setup failed
      return res.status(200).json({
        statuscode: 200,
        error: null,
        result: {
          booking: bookingResult.result,
          message: "Booking created! Payment setup failed. Please complete payment from your bookings page."
        }
      });
    }

    // Success - return both booking and payment info
    res.status(200).json({
      statuscode: 200,
      error: null,
      result: {
        booking: bookingResult.result,
        payment: {
          paymentIntentId: paymentResult.paymentIntentId,
          paymentRedirectUrl: paymentResult.paymentRedirectUrl,
          message: "Booking created successfully. Redirect to complete payment."
        }
      }
    });

  } catch (error) {
    console.error("Booking with payment error:", error);
    res.status(500).json({
      statuscode: 500,
      error: error.message || "Booking and payment processing failed",
      result: []
    });
  }
};

// 🆕 Direct payment session creation (without Express req/res)
async function createPaymentSessionDirect(paymentData, userId) {
  try {
    const { bookingId, amount, currency, paymentMethod } = paymentData;

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
      throw new Error('Booking not found or access denied');
    }

    if (booking.paymentStatus === 'PAID') {
      throw new Error('Booking already paid');
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
        throw new Error('Unsupported payment method');
    }

    if (!paymentResult.success) {
      throw new Error(paymentResult.error);
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

    return {
      success: true,
      paymentIntentId: paymentResult.paymentIntentId,
      paymentRedirectUrl: paymentResult.redirectUrl,
      gateway: paymentResult.gateway
    };

  } catch (error) {
    console.error('Direct payment session error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 🆕 Payment method implementations (copy from your paymentController)
async function createZiinaPaymentSession(booking, amount, currency) {
  console.log('Creating Ziina payment session...');
  console.log('Booking:', booking);
  console.log('Amount:', amount, 'Currency:', currency);
  try {
    const paymentIntent = await axios.post(
      "https://api-v2.ziina.com/api/payment_intent",
      {
        amount: Math.round(amount * 100),
        currency_code: currency,
        message: `Payment for tour booking - Ref: ${booking.reference}`,
        success_url: `${process.env.FRONTEND_URL}/payment-success?bookingId=${booking.id}&paymentIntentId={payment_intent_id}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled?bookingId=${booking.id}`,
        failure_url: `${process.env.FRONTEND_URL}/payment-failed?bookingId=${booking.id}`,
        test: true,
        transaction_source: "directApi",
        expiry: String(Date.now() + 15 * 60 * 1000),
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

async function createCardPaymentSession(booking, amount, currency) {
  // Your card payment implementation
  const paymentSession = {
    id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    url: `${process.env.FRONTEND_URL}/card-payment?bookingId=${booking.id}`
  };

  return {
    success: true,
    paymentIntentId: paymentSession.id,
    redirectUrl: paymentSession.url,
    gateway: 'CARD',
    rawResponse: paymentSession
  };
}

async function createBankTransferSession(booking, amount, currency) {
  const transferReference = `BANK-${booking.reference}-${Date.now()}`;
  
  const bankDetails = {
    bankName: process.env.BANK_NAME || 'Example Bank',
    accountName: process.env.BANK_ACCOUNT_NAME || 'Tour Company LLC',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || '123456789',
    iban: process.env.BANK_IBAN || 'AE070331234567890123456',
    swiftCode: process.env.BANK_SWIFT || 'EXBLAEAD',
    reference: transferReference,
    amount: amount,
    currency: currency,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };

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
    rawResponse: bankDetails
  };
}

function getTourType(apiResponse) {
  if (!apiResponse) return "Tour Booking";
  if (apiResponse.error?.includes("6 Emirates")) return "6 Emirates in a Day Tour with Lunch";
  if (apiResponse.result?.details?.[0]?.servicetype) return apiResponse.result.details[0].servicetype;
  return "Tour Booking";
}



export async function adminList(req, res, next) {
  try {
    const { q, status, paymentStatus } = req.query;
    const where = {};
    if (status) where["status"] = status;
    if (paymentStatus) where["paymentStatus"] = paymentStatus;
    if (q) {
      where["OR"] = [
        { reference: { contains: q, mode: "insensitive" } },
        { supplierRef: { contains: q, mode: "insensitive" } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        b2bAccount: { select: { id: true, name: true, code: true } },
        items: true,
      },
    });
    res.json(bookings);
  } catch (e) { next(e); }
}

export async function adminCancel(req, res, next) {
  try {
    const id = req.params.id;
    // TODO: if supplier booking, call supplier cancel API here.
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    res.json(updated);
  } catch (e) { next(e); }
}




// api booking code 



export const getBookedTickets = async (req, res) => {


  try {
    const ticketData = req.body; 
    console.log("Received ticket fetch request:", ticketData);
    const result = await getBookedTicketsList(ticketData);

    console.log("Fetched tickets:", result);
    return res.status(200).json({
      statuscode: 200,
      error: null,
      result
    });
  } catch (error) {
    console.error("Ticket fetch error:", error);
    return res.status(500).json({
      statuscode: 500,
      error: error.message || "Internal server error",
      result: []
    });
  }
};


export const cancelBooking = async (req, res) => {


  try {
    const cancellationData = req.body;
    
    // Call external API to cancel booking
    const result = await cancelBookings(cancellationData);

    // If external API call is successful, update status in database
    if (result.statuscode === 200) {
      await updateBookingStatus(cancellationData.bookingId, cancellationData.referenceNo);
    }

    return res.status(200).json({
      statuscode: 200,
      error: null,
      result
    });
  } catch (error) {
    console.error("Cancellation error:", error);
    return res.status(500).json({
      statuscode: 500,
      error: error.message || "Internal server error",
      result: []
    });
  }
};

// Function to update booking status to CANCELLED
async function updateBookingStatus(bookingId, referenceNo) {
  try {
    // Convert bookingId to string since externalBookingId is String type in schema
    const bookingIdString = bookingId.toString();
    
    const updatedBooking = await prisma.booking.updateMany({
      where: {
        OR: [
          { externalBookingId: bookingIdString }, // Now using string
          { reference: referenceNo }
        ]
      },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    if (updatedBooking.count === 0) {
      console.warn(`No booking found with externalBookingId: ${bookingIdString} or reference: ${referenceNo}`);
    } else {
      console.log(`Booking status updated to CANCELLED: ${updatedBooking.count} record(s)`);
    }

    return updatedBooking;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw new Error("Failed to update booking status");
  }
}



// get booking from db 
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      statuscode: 200,
      error: null,
      result: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      statuscode: 500,
      error: 'Failed to fetch bookings',
      result: []
    });
  }
};