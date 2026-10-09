// Pure iCalendar (RFC 5545) builder for a trip feed. No runtime APIs, so it runs in Deno and Vitest.

export type CalendarTrip = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  timezone: string | null;
};

export type CalendarItem = {
  id: string;
  title: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  location_name?: string | null;
  address?: string | null;
  provider?: string | null;
  metadata?: unknown;
};

const EXCLUDED_STATUSES = new Set(["idea", "cancelled"]);

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Fold a content line at 75 octets without splitting UTF-8 characters. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74; // continuation lines start with one space
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function dateValue(value: string): string {
  return value.slice(0, 10).replace(/-/g, "");
}

function nextDay(value: string): string {
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Same address order as the Open in Kaarten link: address column, metadata.address, then location name. */
export function itemLocation(item: CalendarItem): string {
  const m = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? (item.metadata as Record<string, unknown>)
    : {};
  return text(item.address) || text(m.address) || text(item.location_name);
}

export function buildTripCalendar(trip: CalendarTrip, items: CalendarItem[], appUrl: string, now = new Date()): string {
  const base = appUrl.replace(/\/+$/, "");
  const link = `${base}/trip/${trip.id}/reis`;
  const stamp = utcStamp(now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vakansie//Reis//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`${trip.name} · Vakansie`)}`,
  ];
  if (trip.timezone) lines.push(`X-WR-TIMEZONE:${escapeText(trip.timezone)}`);

  if (trip.start_date) {
    const end = trip.end_date && trip.end_date >= trip.start_date ? trip.end_date : trip.start_date;
    lines.push(
      "BEGIN:VEVENT",
      `UID:trip-${trip.id}@vakansie`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(trip.start_date)}`,
      `DTEND;VALUE=DATE:${nextDay(end)}`,
      `SUMMARY:${escapeText(trip.name)}`,
      `DESCRIPTION:${escapeText(link)}`,
      "END:VEVENT",
    );
  }

  for (const item of items) {
    if (EXCLUDED_STATUSES.has(item.status) || !item.start_at) continue;
    const start = new Date(item.start_at);
    if (Number.isNaN(start.getTime())) continue;
    const parsedEnd = item.end_at ? new Date(item.end_at) : null;
    const end = parsedEnd && !Number.isNaN(parsedEnd.getTime()) && parsedEnd > start
      ? parsedEnd
      : new Date(start.getTime() + 60 * 60 * 1000);
    const summary = item.status === "planned" ? `${item.title} (nog te regelen)` : item.title;
    const provider = text(item.provider);
    const description = provider ? `${provider}\n${link}` : link;
    const location = itemLocation(item);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@vakansie`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utcStamp(start)}`,
      `DTEND:${utcStamp(end)}`,
      `SUMMARY:${escapeText(summary)}`,
    );
    if (location) lines.push(`LOCATION:${escapeText(location)}`);
    lines.push(`DESCRIPTION:${escapeText(description)}`, "END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
