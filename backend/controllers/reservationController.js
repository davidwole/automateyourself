const Reservation = require("../models/Reservation");
const TimeSlot = require("../models/TimeSlot");
const {
  generateBookingId,
  initializeDefaultSlots,
} = require("../utils/helpers");

// Get available slots for a specific date
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date, partySize = 1 } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    // Validate party size (max 4 per table)
    const partySizeNum = parseInt(partySize);
    if (partySizeNum > 4) {
      return res.status(400).json({
        error: "Maximum party size is 4 guests per table",
      });
    }

    // Check if date is Friday or Saturday
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getUTCDay();

    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      return res.json({
        date,
        partySize: partySizeNum,
        availableSlots: [],
        message: "Reservations are only available on Fridays and Saturdays",
      });
    }

    // Initialize default slots for the date if they don't exist
    await initializeDefaultSlots(date);

    // Get all active time slots for the date
    const timeSlots = await TimeSlot.find({ date, isActive: true }).sort({
      time: 1,
    });

    // Get all confirmed reservations for the date
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const reservations = await Reservation.find({
      dateTime: { $gte: startOfDay, $lte: endOfDay },
      status: "confirmed",
    });

    // Calculate availability for each slot
    // Each reservation takes 1 table regardless of party size (1-4 guests)
    const availableSlots = timeSlots
      .map((slot) => {
        const slotReservations = reservations.filter(
          (res) => res.dateTime.getTime() === slot.dateTime.getTime()
        );

        const tablesReserved = slotReservations.length; // Each reservation = 1 table
        const availableCount = slot.capacity - tablesReserved; // Tables remaining

        return {
          time: slot.time,
          dateTime: slot.dateTime,
          capacity: slot.capacity,
          reserved: tablesReserved,
          availableCount,
          canAccommodate: availableCount > 0, // Need at least 1 table
          slotDuration: slot.slotDuration || 90,
        };
      })
      .filter((slot) => slot.canAccommodate && slot.availableCount > 0);

    res.json({
      date,
      partySize: partySizeNum,
      availableSlots,
      dayOfWeek: dayOfWeek === 5 ? "Friday" : "Saturday",
    });
  } catch (error) {
    console.error("Error getting available slots:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create a new reservation
exports.createReservation = async (req, res) => {
  try {
    const {
      dateTime,
      partySize,
      customerName,
      customerEmail,
      customerPhone,
      specialRequests,
    } = req.body;

    // Validation
    if (
      !dateTime ||
      !partySize ||
      !customerName ||
      !customerEmail ||
      !customerPhone
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate party size
    if (partySize > 4) {
      return res.status(400).json({
        error: "Maximum party size is 4 guests per table",
      });
    }

    const reservationDateTime = new Date(dateTime);

    // Check if the time slot exists and is active
    const timeSlot = await TimeSlot.findOne({
      dateTime: reservationDateTime,
      isActive: true,
    });

    if (!timeSlot) {
      return res.status(400).json({ error: "Invalid time slot" });
    }

    // Check availability - count number of reservations (tables taken)
    const existingReservations = await Reservation.find({
      dateTime: reservationDateTime,
      status: "confirmed",
    });

    const tablesReserved = existingReservations.length;
    const availableTables = timeSlot.capacity - tablesReserved;

    if (availableTables < 1) {
      return res.status(400).json({
        error: "No tables available for this time slot",
        available: availableTables,
      });
    }

    // Create reservation
    const bookingId = generateBookingId();
    const reservation = new Reservation({
      dateTime: reservationDateTime,
      partySize,
      customerName,
      customerEmail,
      customerPhone,
      specialRequests,
      bookingId,
    });

    await reservation.save();

    res.status(201).json({
      message: "Reservation created successfully",
      reservation: {
        bookingId: reservation.bookingId,
        dateTime: reservation.dateTime,
        partySize: reservation.partySize,
        customerName: reservation.customerName,
        status: reservation.status,
        slotDuration: timeSlot.slotDuration || 90,
      },
    });
  } catch (error) {
    console.error("Error creating reservation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get reservation by booking ID
exports.getReservation = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const reservation = await Reservation.findOne({ bookingId });

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    res.json({ reservation });
  } catch (error) {
    console.error("Error getting reservation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Cancel reservation
exports.cancelReservation = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const reservation = await Reservation.findOne({ bookingId });

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (reservation.status === "cancelled") {
      return res.status(400).json({ error: "Reservation already cancelled" });
    }

    reservation.status = "cancelled";
    await reservation.save();

    res.json({
      message: "Reservation cancelled successfully",
      bookingId: reservation.bookingId,
    });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all reservations for a specific date (admin)
exports.getDateReservations = async (req, res) => {
  try {
    const { date } = req.params;

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const reservations = await Reservation.find({
      dateTime: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ dateTime: 1 });

    res.json({
      date,
      reservations,
    });
  } catch (error) {
    console.error("Error getting date reservations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
