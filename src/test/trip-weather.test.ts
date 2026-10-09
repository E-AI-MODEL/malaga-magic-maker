import { describe, expect, it } from "vitest";
import { cacheIsFresh, dailyForecast, needsGeocode, weatherWindow, roundCoord, type MetEntry } from "../../supabase/functions/trip-weather/weather";
import { showWeatherStrip, weatherIconKey } from "@/features/trips/weather";
import { buildTripContext } from "../../supabase/functions/trip-ai-chat/context";

const hour = (time: string, temp: number, symbol: string, mm = 0): MetEntry => ({
  time, data: { instant: { details: { air_temperature: temp } }, next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: mm } } },
});

describe("dailyForecast", () => {
  it("groups hours into trip-local days with max/min, rain and daytime symbol", () => {
    const series = [
      hour("2026-07-01T21:30:00Z", 30, "clearsky_night"), // 23:30 Rome → 1 July
      hour("2026-07-01T22:30:00Z", 18, "rain", 2), // 00:30 Rome → 2 July
      hour("2026-07-02T06:00:00Z", 22, "partlycloudy_day", 0.5),
      hour("2026-07-02T08:00:00Z", 25, "partlycloudy_day"),
      hour("2026-07-02T10:00:00Z", 27, "rain_day", 1),
      hour("2026-07-10T10:00:00Z", 27, "rain_day"), // outside trip
    ];
    const days = dailyForecast(series, "Europe/Rome", "2026-07-01", "2026-07-02");
    expect(days.map((d) => d.date)).toEqual(["2026-07-01", "2026-07-02"]);
    expect(days[1]).toEqual({ date: "2026-07-02", max_c: 27, min_c: 18, precipitation_mm: 3.5, symbol_code: "partlycloudy_day" });
    expect(days[0].symbol_code).toBeNull();
  });
});

describe("weather window", () => {
  const now = new Date("2026-07-01T10:00:00Z");
  const trip = { status: "active", start_date: "2026-07-05", end_date: "2026-07-12", timezone: "Europe/Rome" };
  it("allows trips starting within 9 days or under way", () => {
    expect(weatherWindow(trip, now)).toEqual({ ok: true });
    expect(weatherWindow({ ...trip, start_date: "2026-06-28" }, now)).toEqual({ ok: true });
  });
  it("is too early beyond 9 days, and off for archived trips", () => {
    expect(weatherWindow({ ...trip, start_date: "2026-07-11" }, now)).toEqual({ ok: false, reason: "too_early" });
    expect(weatherWindow({ ...trip, status: "archived" }, now)).toEqual({ ok: false, reason: "archived" });
  });
  it("shows the strip only in the last week and while travelling", () => {
    expect(showWeatherStrip(trip, "Europe/Rome", now)).toBe(true);
    expect(showWeatherStrip({ ...trip, start_date: "2026-07-09" }, "Europe/Rome", now)).toBe(false);
    expect(showWeatherStrip({ ...trip, status: "archived" }, "Europe/Rome", now)).toBe(false);
    expect(showWeatherStrip({ ...trip, start_date: "2026-06-20", end_date: "2026-06-30" }, "Europe/Rome", now)).toBe(false);
  });
});

describe("geocoding and cache", () => {
  const base = { destination_name: "Florence", destination_country: "Italië", destination_latitude: 43.77, destination_longitude: 11.25, destination_geocoded_for: "Florence, Italië" };
  it("re-geocodes only when the destination changes or coordinates are missing", () => {
    expect(needsGeocode(base)).toBe(false);
    expect(needsGeocode({ ...base, destination_name: "Rome" })).toBe(true);
    expect(needsGeocode({ ...base, destination_latitude: null })).toBe(true);
    expect(needsGeocode({ ...base, destination_name: null })).toBe(false);
  });
  it("treats the cache as fresh until expires_at", () => {
    const now = new Date("2026-07-01T10:00:00Z");
    expect(cacheIsFresh("2026-07-01T10:30:00Z", now)).toBe(true);
    expect(cacheIsFresh("2026-07-01T09:59:00Z", now)).toBe(false);
    expect(cacheIsFresh(null, now)).toBe(false);
  });
  it("rounds coordinates to 4 decimals", () => {
    expect(roundCoord(43.7695612)).toBe(43.7696);
  });
});

describe("symbol mapping", () => {
  it("maps MET symbol codes to icons", () => {
    expect(weatherIconKey("clearsky_day")).toBe("sun");
    expect(weatherIconKey("partlycloudy_night")).toBe("partly");
    expect(weatherIconKey("lightrainshowers_day")).toBe("drizzle");
    expect(weatherIconKey("heavyrain")).toBe("rain");
    expect(weatherIconKey("rainandthunder")).toBe("thunder");
    expect(weatherIconKey("sleet")).toBe("snow");
    expect(weatherIconKey("fog")).toBe("fog");
    expect(weatherIconKey("cloudy")).toBe("cloud");
  });
});

describe("Hansie weather context", () => {
  const raw = { now: new Date(), userId: "u", trip: { id: "t", timezone: "Europe/Rome" }, readiness: null, items: [], tasks: [], decisions: [], options: [], votes: [], members: [], profiles: [], travelerProfiles: [], expenses: [], documents: [] };
  it("is null without a forecast and filled with opgehaald_op otherwise", () => {
    expect(buildTripContext(raw).weer).toBeNull();
    const ctx = buildTripContext({ ...raw, weather: { fetched_at: "2026-07-01T10:00:00Z", days: [{ date: "2026-07-02" }] } });
    expect(ctx.weer?.dagen).toHaveLength(1);
    expect(ctx.weer?.opgehaald_op).toBeTruthy();
  });
});
