import mongoose from 'mongoose';

const complaintMessageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderTypeModel'
  },
  senderTypeModel: {
    type: String,
    enum: ['User', 'Admin'],
    required: true
  },
  attachments: [{
    name: String,
    url: String,
    size: Number,
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'TOUR_QUALITY', 'TOUR_GUIDE', 'BOOKING_ISSUES', 'PAYMENT_ISSUES',
      'CANCELLATION', 'REFUND_REQUEST', 'TRANSPORTATION', 'FACILITY',
      'SAFETY', 'TICKET_REJECTION', 'OTHER'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  description: {
    type: String,
    required: true
  },
  expectedOutcome: {
    type: String,
    enum: ['FULL_REFUND', 'PARTIAL_REFUND', 'RESCHEDULE', 'CREDIT', 'OTHER', ''],
    default: ''
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  tourName: {
    type: String,
    default: ''
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'whatsapp'],
    default: 'email'
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },
  adminResponse: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  ratingComment: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  messages: [complaintMessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
complaintSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
complaintSchema.index({ userId: 1, createdAt: -1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });

export default mongoose.model('Complaint', complaintSchema);