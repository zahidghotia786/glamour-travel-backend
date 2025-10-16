import mongoose from "mongoose";

const tourApprovalSchema = new mongoose.Schema({
  tourId: {
    type: String,
    required: true,
  },
  contractId: {
    type: String,
    required: true,
  },
  markupType: {
    type: String,
    required: true,
    enum: ["percentage", "fixed"],
  },
  markupValue: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

// Compound index for unique active approvals
tourApprovalSchema.index({ tourId: 1, contractId: 1 }, { unique: true });

const TourApproval = mongoose.model("TourApproval", tourApprovalSchema);
export default TourApproval; // ✅ Export as default for ES module
