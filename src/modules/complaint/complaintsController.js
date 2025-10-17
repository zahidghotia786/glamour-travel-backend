import { validationResult } from 'express-validator';
import Complaint from '../../models/Complaint.js';
import Booking from '../../models/booking.model.js';
import User from '../../models/users/model.js';

// Get user's complaints
export const getUserComplaints = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category } = req.query;

    const filter = { userId };
    
    if (status) filter.status = status;
    if (category) filter.category = category;

    const complaints = await Complaint.find(filter)
      .populate('bookingId', 'reference totalGross currency status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      complaints
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaints'
    });
  }
};

// Create new complaint
export const createComplaint = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const userId = req.user.id;
    const complaintData = req.body;

    // Get user info for contact details
    const user = await User.findById(userId).select('email phoneNumber');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let tourName = '';
    // If bookingId is provided, get the tour details
    if (complaintData.bookingId) {
      const booking = await Booking.findById(complaintData.bookingId);
      if (booking && booking.tourDetails && booking.tourDetails.length > 0) {
        // You can customize how to get tour name from tourDetails
        tourName = `Tour #${booking.tourDetails[0].tourId}`;
      }
    }

    // Create complaint
    const complaint = new Complaint({
      ...complaintData,
      userId,
      tourName,
      contactEmail: complaintData.contactEmail || user.email,
      contactPhone: complaintData.contactPhone || user.phoneNumber,
      status: 'OPEN',
      messages: [{
        message: complaintData.description,
        senderType: 'user',
        senderId: userId,
        senderTypeModel: 'User'
      }]
    });

    await complaint.save();

    // Populate booking details for response
    await complaint.populate('bookingId', 'reference totalGross currency status');

    res.json({
      success: true,
      complaint,
      message: 'Complaint submitted successfully'
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create complaint'
    });
  }
};

// Get complaint details
export const getComplaintDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const complaint = await Complaint.findOne({
      _id: id,
      userId
    }).populate('bookingId', 'reference totalGross currency status paymentStatus raynaBookingId');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    res.json({
      success: true,
      complaint
    });
  } catch (error) {
    console.error('Get complaint details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaint details'
    });
  }
};

// Add message to complaint
export const addComplaintMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { message, attachments = [] } = req.body;

    // Verify complaint exists and belongs to user
    const complaint = await Complaint.findOne({ _id: id, userId });
    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    // Add new message
    complaint.messages.push({
      message,
      senderType: 'user',
      senderId: userId,
      senderTypeModel: 'User',
      attachments
    });

    complaint.updatedAt = new Date();
    await complaint.save();

    res.json({
      success: true,
      message: complaint.messages[complaint.messages.length - 1]
    });
  } catch (error) {
    console.error('Add complaint message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add message'
    });
  }
};

// Rate complaint resolution
export const rateComplaint = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    const complaint = await Complaint.findOne({
      _id: id,
      userId,
      status: 'RESOLVED'
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found or not resolved'
      });
    }

    complaint.rating = parseInt(rating);
    complaint.ratingComment = comment;
    complaint.status = 'CLOSED';
    complaint.updatedAt = new Date();

    await complaint.save();

    res.json({
      success: true,
      complaint,
      message: 'Thank you for your feedback'
    });
  } catch (error) {
    console.error('Rate complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit rating'
    });
  }
};

// Get user's bookings for complaint form
export const getUserBookingsForComplaints = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await Booking.find({
      userId,
      status: { $in: ['AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'FAILED', 'PAID', 'PENDING', 'SUCCESS'] }
    })
    .select('reference status paymentStatus totalGross currency raynaBookingId tourDetails passengerCount leadPassenger createdAt')
    .sort({ createdAt: -1 });

    console.log("📊 Found bookings:", bookings.length);
    console.log("🔍 Booking details:", bookings);

    // Transform the data to include tour names
    const transformedBookings = bookings.map(booking => {
      let tourName = 'Tour Booking';
      
      if (booking.tourDetails && booking.tourDetails.length > 0) {
        const tourDetail = booking.tourDetails[0];
        tourName = `Tour #${tourDetail.tourId}`;
        
        if (tourDetail.pickup) {
          tourName += ` - ${tourDetail.pickup}`;
        }
      }

      return {
        id: booking._id,
        reference: booking.reference,
        tourName: tourName,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalGross: booking.totalGross,
        currency: booking.currency,
        raynaBookingId: booking.raynaBookingId,
        passengerCount: booking.passengerCount,
        tourDate: booking.tourDetails?.[0]?.tourDate || '',
        createdAt: booking.createdAt
      };
    });

    res.json({
      success: true,
      bookings: transformedBookings
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
};