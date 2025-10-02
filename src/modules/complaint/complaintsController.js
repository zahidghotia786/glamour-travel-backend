// controllers/complaintsController.js - FIXED VERSION
import { validationResult } from 'express-validator';
import prisma from '../../config/db.js';

// Get user's complaints
export const getUserComplaints = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category } = req.query;

    const where = { userId };
    
    if (status) where.status = status;
    if (category) where.category = category;

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        booking: {
          select: {
            reference: true,
            totalGross: true,
            currency: true,
            status: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

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

// Create new complaint - FIXED
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phoneNumber: true }
    });

    // If bookingId is provided, get the tour name from booking items
    let tourName = null;
    if (complaintData.bookingId) {
      const bookingWithItems = await prisma.booking.findUnique({
        where: { id: complaintData.bookingId },
        include: {
          items: {
            select: {
              name: true,
              product: {
                select: {
                  name: true
                }
              }
            },
            take: 1
          }
        }
      });

      if (bookingWithItems && bookingWithItems.items.length > 0) {
        const firstItem = bookingWithItems.items[0];
        tourName = firstItem.name || firstItem.product?.name || null;
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        ...complaintData,
        userId,
        tourName, // Add the tour name here
        contactEmail: complaintData.contactEmail || user.email,
        contactPhone: complaintData.contactPhone || user.phoneNumber,
        status: 'OPEN'
      },
      include: {
        booking: {
          select: {
            reference: true,
            totalGross: true,
            currency: true,
            status: true
          }
        }
      }
    });

    // Create initial message
    await prisma.complaintMessage.create({
      data: {
        complaintId: complaint.id,
        senderType: 'user',
        senderId: userId,
        message: complaintData.description
      }
    });

    // TODO: Send notification to admin

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

    const complaint = await prisma.complaint.findFirst({
      where: {
        id,
        userId // Ensure user can only access their own complaints
      },
      include: {
        booking: {
          select: {
            reference: true,
            totalGross: true,
            currency: true,
            status: true,
            paymentStatus: true,
            externalBookingId: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

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
    const complaint = await prisma.complaint.findFirst({
      where: { id, userId }
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    const complaintMessage = await prisma.complaintMessage.create({
      data: {
        complaintId: id,
        senderType: 'user',
        senderId: userId,
        message,
        attachments
      }
    });

    // Update complaint updatedAt
    await prisma.complaint.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    // TODO: Notify admin about new message

    res.json({
      success: true,
      message: complaintMessage
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

    const complaint = await prisma.complaint.findFirst({
      where: { id, userId, status: 'RESOLVED' }
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found or not resolved'
      });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: {
        rating: parseInt(rating),
        ratingComment: comment,
        status: 'CLOSED'
      }
    });

    res.json({
      success: true,
      complaint: updatedComplaint,
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

// Get user's bookings for complaint form - FIXED
export const getUserBookingsForComplaints = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        status: { in: ['CONFIRMED', 'CANCELLED', 'FAILED'] }
      },
      select: {
        id: true,
        reference: true,
        status: true,
        paymentStatus: true,
        totalGross: true,
        currency: true,
        externalBookingId: true,
        createdAt: true,
        items: {
          select: {
            name: true,
            product: {
              select: {
                name: true
              }
            }
          },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform the data to include tour names
    const transformedBookings = bookings.map(booking => {
      let tourName = 'Unknown Tour';
      
      if (booking.items && booking.items.length > 0) {
        const firstItem = booking.items[0];
        tourName = firstItem.name || (firstItem.product?.name || 'Unknown Tour');
      }

      return {
        id: booking.id,
        reference: booking.reference,
        tourName: tourName,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalGross: booking.totalGross,
        currency: booking.currency,
        externalBookingId: booking.externalBookingId,
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