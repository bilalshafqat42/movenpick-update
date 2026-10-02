const WEEKDAY_NUMBERS = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getPartsInTimeZone(timeZone, date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return {
    weekday: WEEKDAY_NUMBERS[weekday],
    minutesSinceMidnight: hour * 60 + minute,
  };
}

function parseTimeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isWithinBusinessHours(config, date = new Date()) {
  const { timezone, workdays, day_start, day_end } = config;
  const { weekday, minutesSinceMidnight } = getPartsInTimeZone(timezone, date);

  if (!workdays.includes(weekday)) {
    return false;
  }

  const start = parseTimeToMinutes(day_start);
  const end = parseTimeToMinutes(day_end);

  return minutesSinceMidnight >= start && minutesSinceMidnight < end;
}
