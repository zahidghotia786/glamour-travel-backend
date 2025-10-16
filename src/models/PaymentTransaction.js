import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  paymentIntentId: {
    type: String,
    required: true
  },
  amount: Number,
  currency: {
    type: String,
    default: 'AED'
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  gatewayResponse: mongoose.Schema.Types.Mixed,
  gateway: String,
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