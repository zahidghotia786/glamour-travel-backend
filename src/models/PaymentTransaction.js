import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'AED'
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'],
    default: 'PENDING'
  },
  type: {
    type: String,
    enum: ['PAYMENT', 'REFUND', 'PARTIAL_PAYMENT'],
    default: 'PAYMENT'
  },
  gateway: {
    type: String,
    required: true
  },
  gatewayResponse: mongoose.Schema.Types.Mixed,
  gatewayReference: String,
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

paymentTransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('PaymentTransaction', paymentTransactionSchema);