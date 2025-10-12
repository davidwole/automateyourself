const mongoose = require("mongoose");

const timeSlotSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    time: {
      type: String, // Format: HH:MM
      required: true,
    },
    dateTime: {
      type: Date,
      required: true,
      unique: true,
    },
    capacity: {
      type: Number,
      required: true,
      default: 10, // 10 tables available
    },
    slotDuration: {
      type: Number,
      default: 90, // 90 minutes per slot
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index
timeSlotSchema.index({ date: 1, time: 1 });

module.exports = mongoose.model("TimeSlot", timeSlotSchema);
