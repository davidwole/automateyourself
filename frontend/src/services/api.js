const BASEURL = "https://automateyourself.onrender.com";

export const getAvailableSlots = async (date, partySize) => {
  try {
    const response = await fetch(
      `/api/reservations/available?date=${date}&partySize=${partySize}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch available slots");
    }

    const data = await response.json();
    return data.availableSlots;
  } catch (error) {
    console.error("Error fetching available slots:", error);
    throw error;
  }
};

export const createReservation = async (reservationData) => {
  try {
    const response = await fetch(`/api/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reservationData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create reservation");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating reservation:", error);
    throw error;
  }
};

// Helper function to get reservation by booking ID
export const getReservation = async (bookingId) => {
  try {
    const response = await fetch(`/api/reservations/${bookingId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch reservation");
    }

    const data = await response.json();
    return data.reservation;
  } catch (error) {
    console.error("Error fetching reservation:", error);
    throw error;
  }
};
