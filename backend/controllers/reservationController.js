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

    const partySizeNum = parseInt(partySize);

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
    const availableSlots = timeSlots
      .map((slot) => {
        const slotReservations = reservations.filter(
          (res) => res.dateTime.getTime() === slot.dateTime.getTime()
        );

        // Count total tables reserved (each reservation can have multiple tables)
        const tablesReserved = slotReservations.reduce((sum, res) => {
          return sum + (res.tableNumbers ? res.tableNumbers.length : 0);
        }, 0);

        const availableCount = slot.capacity - tablesReserved;

        return {
          time: slot.time,
          dateTime: slot.dateTime,
          capacity: slot.capacity,
          reserved: tablesReserved,
          availableCount,
          canAccommodate: availableCount > 0,
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

// Get reserved tables for a specific time slot
exports.getReservedTables = async (req, res) => {
  try {
    const { dateTime } = req.query;

    if (!dateTime) {
      return res.status(400).json({ error: "DateTime is required" });
    }

    const reservationDateTime = new Date(dateTime);

    // Get all confirmed reservations for this time slot
    const reservations = await Reservation.find({
      dateTime: reservationDateTime,
      status: "confirmed",
    });

    // Extract all reserved table numbers
    const reservedTables = reservations.reduce((tables, res) => {
      if (res.tableNumbers && Array.isArray(res.tableNumbers)) {
        return [...tables, ...res.tableNumbers];
      }
      return tables;
    }, []);

    res.json({
      dateTime: reservationDateTime,
      reservedTables: [...new Set(reservedTables)].sort((a, b) => a - b),
    });
  } catch (error) {
    console.error("Error getting reserved tables:", error);
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
      tableNumbers,
    } = req.body;

    // Validation
    if (
      !dateTime ||
      !partySize ||
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !tableNumbers ||
      !Array.isArray(tableNumbers) ||
      tableNumbers.length === 0
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate table numbers
    const validTables = tableNumbers.every(
      (num) => num >= 1 && num <= 10 && Number.isInteger(num)
    );
    if (!validTables) {
      return res.status(400).json({ error: "Invalid table numbers" });
    }

    // Calculate required tables based on party size
    const requiredTables = Math.ceil(partySize / 4);
    if (tableNumbers.length !== requiredTables) {
      return res.status(400).json({
        error: `Party size of ${partySize} requires exactly ${requiredTables} table(s)`,
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

    // Check if requested tables are already reserved
    const existingReservations = await Reservation.find({
      dateTime: reservationDateTime,
      status: "confirmed",
    });

    const reservedTables = existingReservations.reduce((tables, res) => {
      if (res.tableNumbers && Array.isArray(res.tableNumbers)) {
        return [...tables, ...res.tableNumbers];
      }
      return tables;
    }, []);

    const conflictingTables = tableNumbers.filter((num) =>
      reservedTables.includes(num)
    );

    if (conflictingTables.length > 0) {
      return res.status(400).json({
        error: `Table(s) ${conflictingTables.join(", ")} are already reserved`,
        conflictingTables,
      });
    }

    // Check total capacity
    const totalReservedTables = reservedTables.length;
    const availableTables = timeSlot.capacity - totalReservedTables;

    if (availableTables < tableNumbers.length) {
      return res.status(400).json({
        error: "Not enough tables available for this time slot",
        available: availableTables,
        requested: tableNumbers.length,
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
      tableNumbers: tableNumbers.sort((a, b) => a - b),
    });

    await reservation.save();

    res.status(201).json({
      message: "Reservation created successfully",
      reservation: {
        bookingId: reservation.bookingId,
        dateTime: reservation.dateTime,
        partySize: reservation.partySize,
        customerName: reservation.customerName,
        tableNumbers: reservation.tableNumbers,
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
