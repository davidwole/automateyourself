export const getAvailableSlots = async (date, partySize) => {
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
};
