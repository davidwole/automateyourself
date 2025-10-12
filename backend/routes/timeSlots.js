const express = require("express");
const router = express.Router();
const timeSlotController = require("../controllers/timeSlotController");

// POST /api/timeslots/initialize - Initialize slots for a date
router.post("/initialize", timeSlotController.initializeSlots);

// PUT /api/timeslots/capacity - Update slot capacity
router.put("/capacity", timeSlotController.updateSlotCapacity);

module.exports = router;
