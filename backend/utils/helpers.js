const TimeSlot = require("../models/TimeSlot");

// Generate unique booking ID
const generateBookingId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 9);
  return `BK-${timestamp}-${randomStr}`.toUpperCase();
};

// Initialize default time slots for a given date
const initializeDefaultSlots = async (date) => {
  try {
    // Check if slots already exist for this date
    const existingSlots = await TimeSlot.find({ date });
    if (existingSlots.length > 0) {
      return existingSlots;
    }

    // Check if the date is Friday (5) or Saturday (6)
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getUTCDay();

    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      // Not Friday or Saturday, return empty array
      return [];
    }

    const slots = [];

    // Restaurant hours: 10:00 PM - 12:00 Midnight with 90-minute slots
    // 10:00 PM slot (22:00) - guests can book until 11:30 PM
    // 10:30 PM slot (22:30) - last slot before midnight

    const slotTimes = [
      { hour: 10, minute: 0 }, // 10:00 PM
      { hour: 11, minute: 30 }, // 10:30 PM (last slot to start before midnight)
      { hour: 12, minute: 0 }, // 10:30 PM (last slot to start before midnight)
    ];

    for (const { hour, minute } of slotTimes) {
      const time = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      const dateTime = new Date(`${date}T${time}:00.000Z`);

      slots.push({
        date,
        time,
        dateTime,
        capacity: 10, // 10 tables available per slot
        slotDuration: 90, // 90 minutes per slot
      });
    }

    // Insert all slots
    const createdSlots = await TimeSlot.insertMany(slots);
    return createdSlots;
  } catch (error) {
    console.error("Error initializing default slots:", error);
    throw error;
  }
};

module.exports = {
  generateBookingId,
  initializeDefaultSlots,
};
