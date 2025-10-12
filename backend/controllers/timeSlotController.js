const TimeSlot = require("../models/TimeSlot");
const { initializeDefaultSlots } = require("../utils/helpers");

// Initialize slots for a specific date
exports.initializeSlots = async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const slots = await initializeDefaultSlots(date);

    res.json({
      message: "Slots initialized successfully",
      date,
      slotsCreated: slots.length,
    });
  } catch (error) {
    console.error("Error initializing slots:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update slot capacity
exports.updateSlotCapacity = async (req, res) => {
  try {
    const { dateTime, capacity } = req.body;

    if (!dateTime || !capacity) {
      return res
        .status(400)
        .json({ error: "DateTime and capacity are required" });
    }

    const slot = await TimeSlot.findOneAndUpdate(
      { dateTime: new Date(dateTime) },
      { capacity },
      { new: true }
    );

    if (!slot) {
      return res.status(404).json({ error: "Time slot not found" });
    }

    res.json({
      message: "Slot capacity updated successfully",
      slot,
    });
  } catch (error) {
    console.error("Error updating slot capacity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
