import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema({
  serviceType: String,
  prefix: String,
  firstName: String,
  lastName: String,
  email: String,
  mobile: String,
  nationality: String,
  message: String,
  leadPassenger: Number,
  paxType: String,
  clientReferenceNo: String,
});

const tourDetailSchema = new mongoose.Schema({
  serviceUniqueId: Number,
  tourId: Number,
  optionId: Number,
  adult: Number,
  child: Number,
  infant: Number,
  tourDate: String,
  timeSlotId: Number,
  startTime: String,
  transferId: Number,
  pickup: String,
  adultRate: Number,
  childRate: Number,
  serviceTotal: String,
});

// Add API response schema to handle external API data
const apiResponseSchema = new mongoose.Schema({
  result: {
    details: [
      {
        bookingId: String,
        servicetype: String,
        status: String,
        downloadRequired: Boolean,
      },
    ],
  },
  error: String,
  statuscode: Number,
});

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reference: {
    type: String,
    required: true,
    unique: true,
  },
  clientReferenceNo: String,
  passengerCount: Number,
  leadPassenger: passengerSchema,
  passengers: [passengerSchema],
  tourDetails: [tourDetailSchema],
  totalGross: Number,
  currency: {
    type: String,
    default: "AED",
  },
  paymentMethod: String,
  paymentStatus: {
    type: String,
    enum: ["PENDING", "PAID", "FAILED", "CANCELLED"],
    default: "PENDING",
  },
  paymentIntentId: String,
  paymentGateway: String,
status: {
  type: String,
  enum: ['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED', 'CANCELLED', 'SUCCESS', 'FAILED'],
  default: 'AWAITING_PAYMENT'
},
  gatewayReference: String,
  raynaBookingId: String,
  raynaStatus: {
    type: String,
    enum: ["NOT_SUBMITTED", "PENDING", "CONFIRMED", "FAILED", "CANCELLED"],
    default: "NOT_SUBMITTED",
  },
  raynaBookingResponse: mongoose.Schema.Types.Mixed,
  // Add API response field to store external booking system response
  apiResponse: apiResponseSchema,
  syncedAt: Date, // Add syncedAt field
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

bookingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Booking", bookingSchema);
