export const api = {
  async checkAvailability(dateTime, partySize, duration = 120) {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      available: Math.random() > 0.3,
      tables: [
        {
          _id: "1",
          tableNumber: "T-12",
          capacity: partySize + 1,
          location: "indoor",
        },
        {
          _id: "2",
          tableNumber: "T-08",
          capacity: partySize + 2,
          location: "window",
        },
      ],
      suggestedTable: {
        _id: "1",
        tableNumber: "T-12",
        capacity: partySize + 1,
        location: "indoor",
      },
    };
  },

  async getAvailableSlots(date, partySize) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const slots = [];
    for (let hour = 11; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (Math.random() > 0.4) {
          const time = `${hour.toString().padStart(2, "0")}:${minute
            .toString()
            .padStart(2, "0")}`;
          slots.push({
            time,
            dateTime: `${date}T${time}:00`,
            availableCount: Math.floor(Math.random() * 5) + 1,
          });
        }
      }
    }
    return slots;
  },

  async createReservation(reservationData) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      _id: Date.now().toString(),
      ...reservationData,
      status: "confirmed",
      tableId: { tableNumber: "T-12", capacity: 4, location: "indoor" },
    };
  },

  async getReservations(date) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return [
      {
        _id: "1",
        customerName: "John Smith",
        customerPhone: "+1234567890",
        customerEmail: "john@example.com",
        partySize: 4,
        dateTime: "2025-07-01T19:00:00Z",
        status: "confirmed",
        tableId: { tableNumber: "T-12", capacity: 4, location: "indoor" },
      },
      {
        _id: "2",
        customerName: "Sarah Johnson",
        customerPhone: "+1987654321",
        partySize: 2,
        dateTime: "2025-07-01T20:30:00Z",
        status: "seated",
        tableId: { tableNumber: "T-08", capacity: 4, location: "window" },
      },
    ];
  },
};
