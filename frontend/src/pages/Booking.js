import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Info,
} from "lucide-react";
import "../App.css";
import { getAvailableSlots } from "../services/api";
import { api } from "../services/network";
import Table from "../assets/table.png";

export default function Booking() {
  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    partySize: 2,
    date: "",
    time: "",
    specialRequests: "",
  });
  const [bookingStatus, setBookingStatus] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dateError, setDateError] = useState("");
  const [selectedTables, setSelectedTables] = useState([]);
  const [reservedTables, setReservedTables] = useState([]);

  // Calculate required tables based on party size
  const getRequiredTables = (partySize) => {
    return Math.ceil(partySize / 4);
  };

  // Get next Friday or Saturday
  const getNextAvailableDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    let daysToAdd = 0;

    if (dayOfWeek < 5) {
      daysToAdd = 5 - dayOfWeek;
    } else if (dayOfWeek === 5) {
      daysToAdd = 0;
    } else if (dayOfWeek === 6) {
      daysToAdd = 0;
    } else {
      daysToAdd = 5;
    }

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);
    return nextDate.toISOString().split("T")[0];
  };

  useEffect(() => {
    const initialDate = getNextAvailableDate();
    setBookingForm((prev) => ({ ...prev, date: initialDate }));
  }, []);

  const validateDate = (dateStr) => {
    const selectedDate = new Date(dateStr);
    const dayOfWeek = selectedDate.getDay();

    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      setDateError("Reservations are only available on Fridays and Saturdays");
      return false;
    }

    setDateError("");
    return true;
  };

  const loadAvailableSlots = async () => {
    if (!bookingForm.date) return;

    if (!validateDate(bookingForm.date)) {
      setAvailableSlots([]);
      return;
    }

    setLoading(true);
    try {
      const slots = await getAvailableSlots(
        bookingForm.date,
        bookingForm.partySize
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error("Error loading slots:", error);
      setBookingStatus({
        type: "error",
        message: "Failed to load available slots. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load reserved tables for selected slot
  const loadReservedTables = async (slot) => {
    if (!slot) return;

    try {
      const response = await fetch(
        `https://automateyourself.onrender.com/api/reservations/reserved-tables?dateTime=${slot.dateTime}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reserved tables");
      }

      const data = await response.json();
      setReservedTables(data.reservedTables || []);
    } catch (error) {
      console.error("Error loading reserved tables:", error);
      setReservedTables([]);
    }
  };

  const handleSlotSelection = async (slot) => {
    setSelectedSlot(slot);
    setSelectedTables([]);
    await loadReservedTables(slot);
  };

  const handleTableSelection = (tableNumber) => {
    const requiredTables = getRequiredTables(bookingForm.partySize);

    if (selectedTables.includes(tableNumber)) {
      // Deselect table
      setSelectedTables(selectedTables.filter((t) => t !== tableNumber));
    } else {
      // Select table
      if (selectedTables.length < requiredTables) {
        setSelectedTables(
          [...selectedTables, tableNumber].sort((a, b) => a - b)
        );
      } else {
        // Replace last selected table if already at max
        const newTables = [...selectedTables.slice(0, -1), tableNumber].sort(
          (a, b) => a - b
        );
        setSelectedTables(newTables);
      }
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    const requiredTables = getRequiredTables(bookingForm.partySize);

    if (!selectedSlot) {
      alert("Please select a time slot");
      return;
    }

    if (selectedTables.length !== requiredTables) {
      alert(
        `Please select exactly ${requiredTables} table${
          requiredTables > 1 ? "s" : ""
        } for ${bookingForm.partySize} guests`
      );
      return;
    }

    setLoading(true);
    try {
      const reservationData = {
        dateTime: selectedSlot.dateTime,
        partySize: bookingForm.partySize,
        customerName: bookingForm.customerName,
        customerEmail: bookingForm.customerEmail,
        customerPhone: bookingForm.customerPhone,
        specialRequests: bookingForm.specialRequests,
        tableNumbers: selectedTables,
      };

      const reservation = await api.createReservation(reservationData);

      const ghlReservation = await fetch(
        `https://services.leadconnectorhq.com/hooks/8PiH83Z85bMdl7GfS1Ax/webhook-trigger/96fff4b4-3771-4742-9ef8-0efd504cbe6b`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservationData,
          }),
        }
      );

      const data = await ghlReservation.json();
      console.log("Response:", data);

      setBookingStatus({
        type: "success",
        message: "Reservation confirmed!",
        reservation,
      });

      alert(`
Reservation Confirmed!
Name: ${reservationData.customerName}
Email: ${reservationData.customerEmail}
Phone: ${reservationData.customerPhone}
Party Size: ${reservationData.partySize} guests
Table(s): ${selectedTables.join(", ")}
Time: ${selectedSlot.time}
Duration: 90 minutes
      `);

      // Reset form
      setBookingForm({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        partySize: 2,
        date: getNextAvailableDate(),
        time: "",
        specialRequests: "",
      });
      setSelectedSlot(null);
      setSelectedTables([]);
      setReservedTables([]);

      await loadAvailableSlots();
    } catch (error) {
      setBookingStatus({
        type: "error",
        message:
          error.message || "Failed to create reservation. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingForm.date && bookingForm.partySize) {
      loadAvailableSlots();
    }
  }, [bookingForm.date, bookingForm.partySize]);

  // Reset table selection when party size changes
  useEffect(() => {
    setSelectedTables([]);
  }, [bookingForm.partySize]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setDateError("Cannot select a date in the past");
      setAvailableSlots([]);
      return;
    }

    setBookingForm((prev) => ({ ...prev, date: newDate }));
    setSelectedSlot(null);
    setSelectedTables([]);
    setReservedTables([]);
  };

  const requiredTables = getRequiredTables(bookingForm.partySize);

  return (
    <div className="min-h-screen bg-gradient-to-br">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-4xl font-bold text-slate-800 mb-2 text-center">
              Reserve Your Table
            </h2>
            <p className="text-center text-slate-600 mb-6">
              Available Fridays & Saturdays, 10 PM - 12 Midnight
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Reservation Details:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Each table accommodates up to 4 guests</li>
                    <li>Reservation duration: 90 minutes</li>
                    <li>Available slots: 10:00 PM and 12:00 AM</li>
                    <li>Select your specific table(s) based on party size</li>
                  </ul>
                </div>
              </div>
            </div>

            {bookingStatus && (
              <div
                className={
                  bookingStatus.type === "success"
                    ? "alert alert-success"
                    : "alert alert-error"
                }
              >
                <div className="flex items-center">
                  {bookingStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 mr-2" />
                  )}
                  <span
                    className={
                      bookingStatus.type === "success"
                        ? "text-green-800"
                        : "text-red-800"
                    }
                  >
                    {bookingStatus.message}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleBookingSubmit}>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">
                    Your Information
                  </h3>

                  <div>
                    <label>
                      <Users className="inline-block w-4 h-4 mr-1" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={bookingForm.customerName}
                      onChange={(e) =>
                        setBookingForm((prev) => ({
                          ...prev,
                          customerName: e.target.value,
                        }))
                      }
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label>
                      <Phone className="inline-block w-4 h-4 mr-1" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={bookingForm.customerPhone}
                      onChange={(e) =>
                        setBookingForm((prev) => ({
                          ...prev,
                          customerPhone: e.target.value,
                        }))
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label>
                      <Mail className="inline-block w-4 h-4 mr-1" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={bookingForm.customerEmail}
                      onChange={(e) =>
                        setBookingForm((prev) => ({
                          ...prev,
                          customerEmail: e.target.value,
                        }))
                      }
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">
                    Reservation Details
                  </h3>

                  <div>
                    <label>
                      <Users className="inline-block w-4 h-4 mr-1" />
                      Party Size *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={bookingForm.partySize}
                      onChange={(e) =>
                        setBookingForm((prev) => ({
                          ...prev,
                          partySize: parseInt(e.target.value) || 1,
                        }))
                      }
                      placeholder="Number of guests"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {requiredTables} table{requiredTables > 1 ? "s" : ""}{" "}
                      required (4 guests per table)
                    </p>
                  </div>

                  <div>
                    <label>
                      <Calendar className="inline-block w-4 h-4 mr-1" />
                      Date * (Friday or Saturday only)
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingForm.date}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={handleDateChange}
                    />
                    {dateError && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {dateError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label>Seating Arrangement</label>
                    <img src={Table} alt="Table layout" className="seating" />
                  </div>
                </div>
              </div>

              {selectedSlot && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">
                    Select Your Table(s)
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Select {requiredTables} table{requiredTables > 1 ? "s" : ""}{" "}
                    for your party of {bookingForm.partySize}
                  </p>
                  <div
                    className="flex grid-cols-5 gap-3"
                    style={{ flexWrap: "wrap", justifyContent: "center" }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tableNum) => {
                      const isReserved = reservedTables.includes(tableNum);
                      const isSelected = selectedTables.includes(tableNum);

                      return (
                        <button
                          key={tableNum}
                          type="button"
                          onClick={() =>
                            !isReserved && handleTableSelection(tableNum)
                          }
                          disabled={isReserved}
                          className={`table-buttons rounded-lg border-2 font-semibold transition-all ${
                            isReserved
                              ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                              : isSelected
                              ? "shadow-md button-selected"
                              : "bg-white border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          {tableNum}
                          {isReserved && <div className="text-xs mt-1"></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">
                  <Clock className="inline-block w-4 h-4 mr-1" />
                  Available Time Slots (90-minute duration)
                </h3>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="loading-spinner"></div>
                    <p className="text-slate-600 mt-2">
                      Loading available slots...
                    </p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="slots">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSlotSelection(slot)}
                        className={`time-slot-button p-4 rounded-lg ${
                          selectedSlot?.time === slot.time ? "selected" : ""
                        }`}
                      >
                        <div className="font-bold text-lg mx-1">
                          {slot.time}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {slot.availableCount}{" "}
                          {slot.availableCount === 1 ? "table" : "tables"}{" "}
                          available
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600">
                      {dateError
                        ? "Please select a Friday or Saturday"
                        : "No available slots for selected date"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Try a different date or check back later
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label>Special Requests</label>
                <textarea
                  value={bookingForm.specialRequests}
                  onChange={(e) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      specialRequests: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Any special requests or dietary requirements?"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedSlot ||
                    dateError ||
                    selectedTables.length !== requiredTables
                  }
                  className="btn-primary rounded-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="inline-block w-4 h-4 mr-2" />
                      Confirm Reservation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
