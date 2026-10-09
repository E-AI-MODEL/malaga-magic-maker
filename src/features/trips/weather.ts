import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from "lucide-react";

export type WeatherDay = {
  date: string;
  max_c: number | null;
  min_c: number | null;
  precipitation_mm: number;
  symbol_code: string | null;
};

export type WeatherResult = { available: true; fetched_at: string; days: WeatherDay[] } | { available: false; reason: string };

export type WeatherIconKey = "sun" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "thunder";

/** MET Norway symbol_code (e.g. "partlycloudy_day", "lightrainshowers_night") → icon key. */
export function weatherIconKey(symbol: string | null | undefined): WeatherIconKey {
  const code = (symbol || "").replace(/_(day|night|polartwilight)$/, "");
  if (code.includes("thunder")) return "thunder";
  if (code.includes("snow") || code.includes("sleet")) return "snow";
  if (code.startsWith("light") && code.includes("rain")) return "drizzle";
  if (code.includes("rain")) return "rain";
  if (code === "fog") return "fog";
  if (code === "clearsky") return "sun";
  if (code === "fair" || code === "partlycloudy") return "partly";
  return "cloud";
}

export const WEATHER_ICONS: Record<WeatherIconKey, LucideIcon> = {
  sun: Sun, partly: CloudSun, cloud: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, thunder: CloudLightning,
};

function localDate(now: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(now);
  }
}

/** The strip shows only in the last week before departure and while travelling, never for archived trips. */
export function showWeatherStrip(
  trip: { status: string; start_date: string | null; end_date: string | null },
  timeZone: string,
  now = new Date(),
): boolean {
  if (trip.status === "archived" || !trip.start_date) return false;
  const today = localDate(now, timeZone);
  const diff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
  const end = (trip.end_date || trip.start_date).slice(0, 10);
  if (diff(today, end) < 0) return false;
  return diff(today, trip.start_date.slice(0, 10)) <= 7;
}
