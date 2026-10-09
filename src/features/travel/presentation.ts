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
  { value: "idea", label: "Idee" },
  { value: "planned", label: "Nog te regelen" },
  { value: "confirmed", label: "Geboekt" },
  { value: "paid", label: "Betaald" },
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

/** Type-specific booking details stored in trip_items.metadata. */
export type DetailField = { key: string; label: string; placeholder?: string };

export const typeDetailFields: Record<string, DetailField[]> = {
  flight: [
    { key: "flight_number", label: "Vluchtnummer", placeholder: "Bijv. KL1234" },
    { key: "departure_airport", label: "Van (luchthaven)", placeholder: "Bijv. AMS" },
    { key: "arrival_airport", label: "Naar (luchthaven)", placeholder: "Bijv. FCO" },
    { key: "seat", label: "Stoel(en)" },
  ],
  train: [
    { key: "departure_station", label: "Van (station)" },
    { key: "arrival_station", label: "Naar (station)" },
    { key: "seat", label: "Wagon / stoel" },
  ],
  ferry: [
    { key: "departure_port", label: "Van (haven)" },
    { key: "arrival_port", label: "Naar (haven)" },
  ],
  stay: [
    { key: "address", label: "Adres" },
    { key: "check_in_time", label: "Inchecken vanaf", placeholder: "Bijv. 15:00" },
    { key: "check_out_time", label: "Uitchecken voor", placeholder: "Bijv. 11:00" },
    { key: "guests", label: "Aantal gasten" },
  ],
  rental_car: [
    { key: "pickup_location", label: "Ophalen bij" },
    { key: "dropoff_location", label: "Inleveren bij" },
    { key: "car_class", label: "Type auto" },
  ],
  transfer: [
    { key: "pickup_location", label: "Ophalen bij" },
    { key: "dropoff_location", label: "Afzetten bij" },
  ],
  activity: [{ key: "meeting_point", label: "Verzamelpunt" }],
  restaurant: [{ key: "party_size", label: "Aantal personen" }],
  event: [{ key: "seat", label: "Plaats / vak" }],
  ticket: [{ key: "seat", label: "Plaats / vak" }],
};

export function detailFieldsFor(type: string): DetailField[] {
  return typeDetailFields[type] || [];
}

/** Keeps only non-empty string details for the given type; other metadata keys are preserved. */
export function mergeDetails(metadata: unknown, type: string, details: Record<string, string>) {
  const base = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? { ...(metadata as Record<string, unknown>) } : {};
  const allKeys = new Set(Object.values(typeDetailFields).flat().map((f) => f.key));
  for (const key of allKeys) delete base[key];
  for (const field of detailFieldsFor(type)) {
    const value = (details[field.key] || "").trim();
    if (value) base[field.key] = value.slice(0, 200);
  }
  return base;
}

export function readDetails(metadata: unknown): Record<string, string> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(metadata as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
  return out;
}

const BOOKABLE = new Set(["flight", "train", "ferry", "stay", "rental_car", "transfer", "ticket"]);

export type TimelineWarning = { kind: "overlap" | "missing_stay" | "no_reference" | "outside_trip"; message: string; itemIds: string[] };

type WarnItem = { id: string; type: string; title: string; status: string; start_at: string | null; end_at: string | null; booking_reference: string | null };

const DAY = 86_400_000;
const dayStart = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/**
 * Timeline checks: overlapping stays or transport, nights within the trip
 * without a stay, and booked items without a booking reference.
 */
export function timelineWarnings(items: WarnItem[], tripStart: string | null, tripEnd: string | null): TimelineWarning[] {
  // Ideas are not bookings: like cancelled items they never overlap, cover a night or fall outside the trip.
  const active = items.filter((i) => i.status !== "cancelled" && i.status !== "idea");
  const warnings: TimelineWarning[] = [];

  const timed = active.filter((i) => i.start_at && i.end_at && (i.type === "stay" || BOOKABLE.has(i.type)));
  for (let a = 0; a < timed.length; a++) {
    for (let b = a + 1; b < timed.length; b++) {
      const x = timed[a], y = timed[b];
      const sameKind = (x.type === "stay") === (y.type === "stay");
      if (!sameKind) continue;
      if (new Date(x.start_at!) < new Date(y.end_at!) && new Date(y.start_at!) < new Date(x.end_at!)) {
        warnings.push({ kind: "overlap", message: `${x.title} en ${y.title} overlappen in tijd.`, itemIds: [x.id, y.id] });
      }
    }
  }

  if (tripStart && tripEnd && tripEnd > tripStart) {
    const stays = active.filter((i) => i.type === "stay" && i.start_at && i.end_at);
    const missing: string[] = [];
    for (let t = dayStart(tripStart); t < dayStart(tripEnd); t += DAY) {
      const covered = stays.some((s) => dayStart(s.start_at!) <= t && dayStart(s.end_at!) > t);
      if (!covered) missing.push(new Date(t).toISOString().slice(0, 10));
    }
    if (missing.length > 0) {
      const n = missing.length;
      warnings.push({ kind: "missing_stay", message: `${n} ${n === 1 ? "nacht" : "nachten"} nog zonder overnachting.`, itemIds: [] });
    }
  }

  const noRef = active.filter((i) => BOOKABLE.has(i.type) && (i.status === "confirmed" || i.status === "paid") && !i.booking_reference);
  if (noRef.length > 0) {
    warnings.push({ kind: "no_reference", message: `${noRef.length} geboekt ${noRef.length === 1 ? "onderdeel heeft" : "onderdelen hebben"} nog geen boekingsnummer.`, itemIds: noRef.map((i) => i.id) });
  }
  if (tripStart && tripEnd) {
    const outside = itemsOutsideTrip(active, tripStart, tripEnd);
    if (outside.length > 0) {
      const n = outside.length;
      warnings.push({ kind: "outside_trip", message: `${n} ${n === 1 ? "onderdeel valt" : "onderdelen vallen"} buiten je reisdata.`, itemIds: outside.map((i) => i.id) });
    }
  }
  return warnings;
}

/** Items (not ideas or cancelled) with a start before the first or after the last trip day (UTC date). */
export function itemsOutsideTrip<T extends { status: string; start_at: string | null }>(items: T[], tripStart: string, tripEnd: string): T[] {
  return items.filter((i) => {
    if (i.status === "idea" || i.status === "cancelled" || !i.start_at) return false;
    const day = i.start_at.slice(0, 10);
    return day < tripStart || day > tripEnd;
  });
}

/** Shift dates by the same number of days the trip start moved. */
export function shiftItemDates(
  item: { start_at: string | null; end_at: string | null },
  oldStart: string,
  newStart: string,
): { start_at: string | null; end_at: string | null } {
  const days = Math.round((dayStart(newStart) - dayStart(oldStart)) / DAY);
  const shift = (v: string | null) => (v ? new Date(new Date(v).getTime() + days * DAY).toISOString() : null);
  return { start_at: shift(item.start_at), end_at: shift(item.end_at) };
}
