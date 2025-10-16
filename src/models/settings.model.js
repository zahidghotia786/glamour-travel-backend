import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

export default mongoose.model("Settings", SettingsSchema);
