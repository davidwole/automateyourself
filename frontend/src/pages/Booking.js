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

  // Get next Friday or Saturday
  const getNextAvailableDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    let daysToAdd = 0;

    if (dayOfWeek < 5) {
      // Monday to Thursday - next Friday
      daysToAdd = 5 - dayOfWeek;
    } else if (dayOfWeek === 5) {
      // Friday - today
      daysToAdd = 0;
    } else if (dayOfWeek === 6) {
      // Saturday - today
      daysToAdd = 0;
    } else {
      // Sunday - next Friday
      daysToAdd = 5;
    }

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);
    return nextDate.toISOString().split("T")[0];
  };

  useEffect(() => {
    // Set initial date to next available Friday/Saturday
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

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      alert("Please select a time slot");
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

      // Reload available slots
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

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare only dates

    // Prevent selecting dates in the past
    if (selectedDate < today) {
      setDateError("Cannot select a date in the past");
      setAvailableSlots([]);
      return;
    }

    setBookingForm((prev) => ({ ...prev, date: newDate }));
    setSelectedSlot(null);
  };

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

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Reservation Details:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Each table accommodates up to 4 guests</li>
                    <li>Reservation duration: 90 minutes</li>
                    <li>Available slots: 10:00 PM and 12:00 AM</li>
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
                {bookingStatus.reservation && (
                  <div className="text-sm text-green-700 mt-1">
                    Reserved for {bookingStatus.reservation.partySize} guests
                    (90-minute slot)
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleBookingSubmit}>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Customer Information */}
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

                {/* Reservation Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">
                    Reservation Details
                  </h3>

                  <div>
                    <label>
                      <Users className="inline-block w-4 h-4 mr-1" />
                      Party Size * (Max 4)
                    </label>
                    <select
                      required
                      value={bookingForm.partySize}
                      onChange={(e) =>
                        setBookingForm((prev) => ({
                          ...prev,
                          partySize: parseInt(e.target.value),
                        }))
                      }
                    >
                      {[1, 2, 3, 4].map((size) => (
                        <option key={size} value={size}>
                          {size} {size === 1 ? "Guest" : "Guests"}
                        </option>
                      ))}
                    </select>
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
                </div>
              </div>

              {/* Available Time Slots */}
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
                        onClick={() => setSelectedSlot(slot)}
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
                        {/* <div className="text-xs text-slate-500 mt-1 mx-1">
                          90-minute slot
                        </div> */}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600">
                      {dateError
                        ? "Please select a Friday or Saturday"
                        : "No available slots for selected date and party size"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Try a different date or check back later
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !selectedSlot || dateError}
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
