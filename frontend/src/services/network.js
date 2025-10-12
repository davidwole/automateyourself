const BASEURL = "http://localhost:5001";

export const api = {
  async createReservation(reservationData) {
    try {
      const response = await fetch(
        `https://automateyourself.onrender.com/api/reservations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reservationData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create reservation");
      }

      const data = await response.json();
      return data.reservation;
    } catch (error) {
      console.error("Error creating reservation:", error);
      throw error;
    }
  },

  async getReservation(bookingId) {
    try {
      const response = await fetch(
        `https://automateyourself.onrender.com/api/reservations/${bookingId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reservation");
      }

      const data = await response.json();
      return data.reservation;
    } catch (error) {
      console.error("Error fetching reservation:", error);
      throw error;
    }
  },

  async cancelReservation(bookingId) {
    try {
      const response = await fetch(
        `https://automateyourself.onrender.com/api/reservations/${bookingId}/cancel`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel reservation");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      throw error;
    }
  },
};
