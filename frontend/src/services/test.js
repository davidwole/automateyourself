// Enhanced API with realistic slot management
export const testapi = {
  // Restaurant configuration
  restaurantConfig: {
    openingHours: {
      start: 11, // 11 AM
      end: 22, // 10 PM
    },
    slotInterval: 30, // 30 minutes between slots
    tables: [
      { id: 1, capacity: 2, location: "Window" },
      { id: 2, capacity: 4, location: "Main Floor" },
      { id: 3, capacity: 6, location: "Main Floor" },
      { id: 4, capacity: 2, location: "Patio" },
      { id: 5, capacity: 4, location: "Private" },
      { id: 6, capacity: 8, location: "Private" },
      { id: 7, capacity: 2, location: "Bar" },
      { id: 8, capacity: 4, location: "Main Floor" },
    ],
    // Default availability rules
    defaultAvailability: {
      // Lunch service (11 AM - 3 PM)
      lunch: { start: 11, end: 15, tablesOpen: 0.8 }, // 80% of tables available
      // Dinner service (5 PM - 10 PM)
      dinner: { start: 17, end: 22, tablesOpen: 1.0 }, // 100% of tables available
      // Slow periods (3 PM - 5 PM)
      slowPeriod: { start: 15, end: 17, tablesOpen: 0.4 }, // 40% of tables available
    },
    // Booking duration in minutes
    defaultBookingDuration: 120,
  },

  // In-memory storage for bookings (replace with actual database)
  bookings: [
    // Sample existing bookings
    {
      id: 1,
      date: "2025-07-05",
      time: "12:00",
      partySize: 4,
      tableId: 2,
      customerName: "John Doe",
      duration: 120,
    },
    {
      id: 2,
      date: "2025-07-05",
      time: "18:30",
      partySize: 2,
      tableId: 1,
      customerName: "Jane Smith",
      duration: 120,
    },
  ],

  // Get available slots for a specific date and party size
  getAvailableSlots: async function (date, partySize) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const slots = [];
    const {
      openingHours,
      slotInterval,
      tables,
      defaultAvailability,
      defaultBookingDuration,
    } = this.restaurantConfig;

    // Generate all possible time slots
    for (let hour = openingHours.start; hour < openingHours.end; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const time = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const dateTime = `${date}T${time}:00`;

        // Determine service period
        const servicePeriod = this.getServicePeriod(hour);

        // Calculate base availability based on service period
        const baseAvailability = this.calculateBaseAvailability(
          hour,
          servicePeriod
        );

        // Get suitable tables for party size
        const suitableTables = this.getSuitableTables(partySize);

        // Calculate actual availability considering existing bookings
        const availableCount = this.calculateAvailableCount(
          date,
          time,
          suitableTables,
          baseAvailability,
          defaultBookingDuration
        );

        // Only add slot if there are available tables
        if (availableCount > 0) {
          slots.push({
            time,
            dateTime,
            availableCount,
            servicePeriod,
            suitableTables: suitableTables.length,
          });
        }
      }
    }

    return slots;
  },

  // Determine which service period a time falls into
  getServicePeriod: function (hour) {
    const { defaultAvailability } = this.restaurantConfig;

    if (
      hour >= defaultAvailability.lunch.start &&
      hour < defaultAvailability.lunch.end
    ) {
      return "lunch";
    } else if (
      hour >= defaultAvailability.dinner.start &&
      hour < defaultAvailability.dinner.end
    ) {
      return "dinner";
    } else {
      return "slowPeriod";
    }
  },

  // Calculate base availability percentage
  calculateBaseAvailability: function (hour, servicePeriod) {
    const { defaultAvailability } = this.restaurantConfig;
    const periodConfig = defaultAvailability[servicePeriod];

    // Add some randomness to make it more realistic
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    return Math.min(periodConfig.tablesOpen * randomFactor, 1.0);
  },

  // Get tables suitable for party size
  getSuitableTables: function (partySize) {
    const { tables } = this.restaurantConfig;

    // Find tables that can accommodate the party size
    // Prefer tables that are close to the party size but not too large
    return tables
      .filter((table) => {
        return table.capacity >= partySize && table.capacity <= partySize + 2;
      })
      .sort((a, b) => a.capacity - b.capacity); // Sort by capacity (smallest first)
  },

  // Calculate how many tables are actually available
  calculateAvailableCount: function (
    date,
    time,
    suitableTables,
    baseAvailability,
    bookingDuration
  ) {
    // Get existing bookings for this date and time slot
    const conflictingBookings = this.getConflictingBookings(
      date,
      time,
      bookingDuration
    );

    // Remove booked tables from suitable tables
    const availableTables = suitableTables.filter((table) => {
      return !conflictingBookings.some(
        (booking) => booking.tableId === table.id
      );
    });

    // Apply base availability factor
    const maxAvailable = Math.floor(availableTables.length * baseAvailability);

    return Math.max(0, maxAvailable);
  },

  // Get bookings that conflict with a specific time slot
  getConflictingBookings: function (date, time, bookingDuration) {
    const requestedStart = new Date(`${date}T${time}:00`);
    const requestedEnd = new Date(
      requestedStart.getTime() + bookingDuration * 60000
    );

    return this.bookings.filter((booking) => {
      if (booking.date !== date) return false;

      const bookingStart = new Date(`${booking.date}T${booking.time}:00`);
      const bookingEnd = new Date(
        bookingStart.getTime() + booking.duration * 60000
      );

      // Check if time slots overlap
      return requestedStart < bookingEnd && requestedEnd > bookingStart;
    });
  },

  // Create a new reservation
  createReservation: async function (reservationData) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { date, partySize, dateTime } = reservationData;
    const time = dateTime.split("T")[1].substring(0, 5);

    // Find a suitable table
    const suitableTables = this.getSuitableTables(partySize);
    const conflictingBookings = this.getConflictingBookings(
      date,
      time,
      this.restaurantConfig.defaultBookingDuration
    );

    const availableTable = suitableTables.find((table) => {
      return !conflictingBookings.some(
        (booking) => booking.tableId === table.id
      );
    });

    if (!availableTable) {
      throw new Error("No available tables for the selected time slot");
    }

    // Create new booking
    const newBooking = {
      id: this.bookings.length + 1,
      date,
      time,
      partySize,
      tableId: availableTable.id,
      customerName: reservationData.customerName,
      customerPhone: reservationData.customerPhone,
      customerEmail: reservationData.customerEmail,
      specialRequests: reservationData.specialRequests,
      duration: this.restaurantConfig.defaultBookingDuration,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    // Add to bookings
    this.bookings.push(newBooking);

    // Return reservation with table details
    return {
      ...newBooking,
      tableId: {
        ...availableTable,
        tableNumber: availableTable.id,
      },
    };
  },

  // Get reservations for a specific date
  getReservations: async function (date) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const { tables } = this.restaurantConfig;

    return this.bookings
      .filter((booking) => booking.date === date)
      .map((booking) => ({
        ...booking,
        _id: booking.id,
        dateTime: `${booking.date}T${booking.time}:00`,
        tableId: {
          ...tables.find((t) => t.id === booking.tableId),
          tableNumber: booking.tableId,
        },
      }))
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  },

  // Update restaurant configuration
  updateConfig: function (newConfig) {
    this.restaurantConfig = { ...this.restaurantConfig, ...newConfig };
  },

  // Get current restaurant stats
  getStats: function () {
    const today = new Date().toISOString().split("T")[0];
    const todayBookings = this.bookings.filter(
      (booking) => booking.date === today
    );

    return {
      totalTables: this.restaurantConfig.tables.length,
      todayBookings: todayBookings.length,
      currentlySeated: todayBookings.filter((b) => b.status === "seated")
        .length,
      occupancyRate: Math.round(
        (todayBookings.length / this.restaurantConfig.tables.length) * 100
      ),
    };
  },
};

// Export individual functions for backward compatibility
export const getAvailableSlots = testapi.getAvailableSlots.bind(testapi);
export const createReservation = testapi.createReservation.bind(testapi);
export const getReservations = testapi.getReservations.bind(testapi);
