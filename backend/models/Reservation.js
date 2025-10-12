const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    dateTime: {
      type: Date,
      required: true,
      index: true,
    },
    partySize: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "no-show"],
      default: "confirmed",
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    bookingId: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
reservationSchema.index({ dateTime: 1, status: 1 });

module.exports = mongoose.model("Reservation", reservationSchema);
