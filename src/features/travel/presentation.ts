export const travelTypes = [
  { value: "flight", label: "Vliegtuig" },
  { value: "train", label: "Trein" },
  { value: "ferry", label: "Boot" },
  { value: "stay", label: "Verblijf" },
  { value: "rental_car", label: "Huurauto" },
  { value: "transfer", label: "Transfer" },
  { value: "activity", label: "Activiteit" },
  { value: "restaurant", label: "Restaurant" },
  { value: "event", label: "Evenement" },
  { value: "ticket", label: "Ticket" },
  { value: "custom", label: "Anders" },
] as const;

export const travelStatuses = [
  { value: "planned", label: "Nog te regelen" },
  { value: "confirmed", label: "Bevestigd" },
  { value: "completed", label: "Afgerond" },
  { value: "cancelled", label: "Geannuleerd" },
] as const;

export function getTravelType(value: string) {
  return travelTypes.find((item) => item.value === value) || { value, label: "Reisonderdeel" };
}

export function getTravelStatus(value: string) {
  return travelStatuses.find((item) => item.value === value)?.label || value;
}

function dateTimeParts(value: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return Object.fromEntries(
    formatter.formatToParts(new Date(value)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
}

export function isoToLocalInput(value: string | null, timezone: string) {
  if (!value) return "";
  const parts = dateTimeParts(value, timezone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function timezoneOffsetAt(date: Date, timezone: string) {
  const parts = dateTimeParts(date.toISOString(), timezone);
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return representedAsUtc - date.getTime();
}

export function localInputToIso(value: string, timezone: string) {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = new Date(wallClockAsUtc);
  let offset = timezoneOffsetAt(guess, timezone);
  guess = new Date(wallClockAsUtc - offset);

  const correctedOffset = timezoneOffsetAt(guess, timezone);
  if (correctedOffset !== offset) {
    offset = correctedOffset;
    guess = new Date(wallClockAsUtc - offset);
  }

  return guess.toISOString();
}

export function formatTripDateTime(value: string | null, timezone: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function tripDayKey(value: string | null, timezone: string) {
  if (!value) return "undated";
  const parts = dateTimeParts(value, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatTripDay(key: string, timezone: string) {
  if (key === "undated") return "Nog zonder datum";
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${key}T12:00:00Z`));
}
