const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");

// GET /api/reservations/available - Get available slots
router.get("/available", reservationController.getAvailableSlots);

// GET /api/reservations/reserved-tables - Get reserved tables for a time slot
router.get("/reserved-tables", reservationController.getReservedTables);

// GET /api/reservations/date/:date - Get all reservations for a date (admin)
// This must come BEFORE the /:bookingId route
router.get("/date/:date", reservationController.getDateReservations);

// POST /api/reservations - Create new reservation
router.post("/", reservationController.createReservation);

// GET /api/reservations/:bookingId - Get reservation by booking ID
router.get("/:bookingId", reservationController.getReservation);

// PUT /api/reservations/:bookingId/cancel - Cancel reservation
router.put("/:bookingId/cancel", reservationController.cancelReservation);

module.exports = router;
