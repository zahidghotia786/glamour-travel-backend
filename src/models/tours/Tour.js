// backend/src/modules/tour/models/Tour.js
import mongoose from "mongoose";

const TourSchema = new mongoose.Schema(
  {
    tourId: {
      type: String,
      required: true,
      index: true,
    },
    contractId: {
      type: String,
      index: true,
    },
    tourName: {
      type: String,
    },
    cityName: {
      type: String,
      required: true,
      index: true,
    },
    countryName: {
      type: String,
      required: true,
    },
    priceAmount: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    price: {
      type: mongoose.Schema.Types.Mixed, // full price object from API
    },
    localImageUrl: {
      type: String, // path to locally downloaded image
    },
    rawJson: {
      type: mongoose.Schema.Types.Mixed, // store full API response for reference
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // optional extra info
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
TourSchema.index({ cityName: 1, tourId: 1 });
TourSchema.index({ countryName: 1 });

export default mongoose.model("Tour", TourSchema);
