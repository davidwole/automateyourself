export const formatReadableDate = (isoString, locale = "en-US") => {
  const date = new Date(isoString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return date.toLocaleString(locale, options);
};

export const extractTime = (isoString, locale = "en-US") => {
  const date = new Date(isoString);
  const options = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return date.toLocaleTimeString(locale, options);
};

// Example usage:
const timeOnly = extractTime("2025-07-06T19:30:00");
console.log(timeOnly); // "7:30 PM"
