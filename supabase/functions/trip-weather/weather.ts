// Pure weather helpers for trip-weather. No runtime APIs, so they run in Deno and Vitest.

export type WeatherDay = {
  date: string; // YYYY-MM-DD in trip time zone
  max_c: number | null;
  min_c: number | null;
  precipitation_mm: number;
  symbol_code: string | null;
};

export type WindowResult = { ok: true } | { ok: false; reason: "archived" | "no_dates" | "too_early" | "ended" };

const FORECAST_DAYS = 9;

function validTimeZone(tz: unknown): string {
  if (typeof tz === "string" && tz) {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: tz });
      return tz;
    } catch { /* fall through */ }
  }
  return "Europe/Amsterdam";
}

export function localDate(date: Date, tz: unknown): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: validTimeZone(tz) }).format(date);
}

function localHour(date: Date, tz: unknown): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: validTimeZone(tz), hour: "2-digit", hourCycle: "h23" }).format(date);
  return Number(hour);
}

function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Weather only for active trips that start within 9 days or are under way. */
export function weatherWindow(
  trip: { status: string; start_date: string | null; end_date: string | null; timezone: string | null },
  now: Date,
): WindowResult {
  if (trip.status === "archived") return { ok: false, reason: "archived" };
  if (!trip.start_date) return { ok: false, reason: "no_dates" };
  const today = localDate(now, trip.timezone);
  const end = (trip.end_date || trip.start_date).slice(0, 10);
  if (dayDiff(today, end) < 0) return { ok: false, reason: "ended" };
  if (dayDiff(today, trip.start_date.slice(0, 10)) > FORECAST_DAYS) return { ok: false, reason: "too_early" };
  return { ok: true };
}

export function geocodeKey(destination: string | null, country: string | null): string | null {
  const parts = [destination, country].map((v) => (v || "").trim()).filter(Boolean);
  return parts.length && (destination || "").trim() ? parts.join(", ") : null;
}

/** Geocode only when coordinates are missing or the destination changed since the last lookup. */
export function needsGeocode(trip: {
  destination_name: string | null;
  destination_country: string | null;
  destination_latitude: number | string | null;
  destination_longitude: number | string | null;
  destination_geocoded_for: string | null;
}): boolean {
  const key = geocodeKey(trip.destination_name, trip.destination_country);
  if (!key) return false;
  if (trip.destination_latitude === null || trip.destination_longitude === null) return true;
  return trip.destination_geocoded_for !== key;
}

export function cacheIsFresh(expiresAt: string | null | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t > now.getTime();
}

export function roundCoord(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Expires header → ISO date; falls back to 30 minutes when missing or unreadable. */
export function expiryFrom(header: string | null, now: Date): string {
  const t = header ? Date.parse(header) : NaN;
  return new Date(Number.isFinite(t) && t > now.getTime() ? t : now.getTime() + 30 * 60_000).toISOString();
}

type Period = { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
export type MetEntry = {
  time: string;
  data: {
    instant?: { details?: { air_temperature?: number } };
    next_1_hours?: Period;
    next_6_hours?: Period & { details?: { precipitation_amount?: number; air_temperature_max?: number; air_temperature_min?: number } };
  };
};

/** Hourly/6-hourly MET series → one row per trip day in the trip time zone. */
export function dailyForecast(series: MetEntry[], tz: string | null, startDate: string, endDate: string | null): WeatherDay[] {
  const end = (endDate || startDate).slice(0, 10);
  const start = startDate.slice(0, 10);
  const days = new Map<string, { temps: number[]; precip: number; symbols: Map<string, number> }>();

  for (const entry of series) {
    const time = new Date(entry.time);
    if (Number.isNaN(time.getTime())) continue;
    const date = localDate(time, tz);
    if (date < start || date > end) continue;
    const day = days.get(date) || { temps: [] as number[], precip: 0, symbols: new Map<string, number>() };
    days.set(date, day);

    const temp = entry.data.instant?.details?.air_temperature;
    if (typeof temp === "number") day.temps.push(temp);
    const six = entry.data.next_6_hours?.details;
    if (!entry.data.next_1_hours && six) {
      if (typeof six.air_temperature_max === "number") day.temps.push(six.air_temperature_max);
      if (typeof six.air_temperature_min === "number") day.temps.push(six.air_temperature_min);
    }

    const period = entry.data.next_1_hours || entry.data.next_6_hours;
    const amount = period?.details?.precipitation_amount;
    if (typeof amount === "number") day.precip += amount;

    const hour = localHour(time, tz);
    const symbol = period?.summary?.symbol_code;
    if (symbol && hour >= 6 && hour < 18) day.symbols.set(symbol, (day.symbols.get(symbol) || 0) + 1);
  }

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      let symbol: string | null = null;
      let best = 0;
      for (const [code, count] of d.symbols) if (count > best) { best = count; symbol = code; }
      return {
        date,
        max_c: d.temps.length ? Math.round(Math.max(...d.temps)) : null,
        min_c: d.temps.length ? Math.round(Math.min(...d.temps)) : null,
        precipitation_mm: Math.round(d.precip * 10) / 10,
        symbol_code: symbol,
      };
    });
}
