import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { cacheIsFresh, dailyForecast, expiryFrom, geocodeKey, needsGeocode, roundCoord, weatherWindow, type MetEntry } from "./weather.ts";

const USER_AGENT = "Vakansie/1.0 (https://vakansie.app)";
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

// Nominatim policy: max 1 request per second (per instance; lookups are cached per trip).
let lastGeocodeAt = 0;
async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  const wait = lastGeocodeAt + 1000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocodeAt = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) { await res.text(); return null; }
  const rows = await res.json().catch(() => []);
  const lat = Number(rows?.[0]?.lat);
  const lon = Number(rows?.[0]?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return json(500, { error: "Weer is even niet beschikbaar." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: claims, error: claimsError } = await userClient.auth.getClaims(authHeader.slice(7));
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (claimsError || !userId) return json(401, { error: "Unauthorized" });

  const body = await req.json().catch(() => null);
  const tripId = body?.tripId;
  if (!isUuid(tripId)) return json(400, { error: "tripId is required" });

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // SECURITY BOUNDARY: no trip data is read before this membership check.
  const { data: member, error: memberError } = await db
    .from("trip_members").select("trip_id").eq("trip_id", tripId).eq("user_id", userId).maybeSingle();
  if (memberError) return json(500, { error: "Authorization check failed" });
  if (!member) return json(403, { error: "Forbidden" });

  try {
    const { data: trip } = await db.from("trip")
      .select("status, start_date, end_date, timezone, destination_name, destination_country, destination_latitude, destination_longitude, destination_geocoded_for")
      .eq("id", tripId).single();
    if (!trip) return json(404, { error: "Not found" });

    const now = new Date();
    const window = weatherWindow(trip, now);
    if (!window.ok) return json(200, { available: false, reason: window.reason });

    const { data: cache } = await db.from("trip_weather_cache").select("*").eq("trip_id", tripId).maybeSingle();
    if (cache && cacheIsFresh(cache.expires_at, now)) return json(200, cache.payload);

    // Location: a stay with filled-in coordinates wins; otherwise the trip destination.
    const { data: stays } = await db.from("trip_items")
      .select("latitude, longitude").eq("trip_id", tripId).eq("type", "stay")
      .not("latitude", "is", null).not("longitude", "is", null).order("start_at").limit(1);
    let lat = stays?.[0] ? Number(stays[0].latitude) : NaN;
    let lon = stays?.[0] ? Number(stays[0].longitude) : NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      if (needsGeocode(trip)) {
        const key = geocodeKey(trip.destination_name, trip.destination_country)!;
        const found = await geocode(key);
        if (found) {
          await db.from("trip").update({
            destination_latitude: found.lat, destination_longitude: found.lon, destination_geocoded_for: key,
          }).eq("id", tripId);
          trip.destination_latitude = found.lat;
          trip.destination_longitude = found.lon;
        }
      }
      lat = Number(trip.destination_latitude);
      lon = Number(trip.destination_longitude);
    }
    if (trip.destination_latitude === null && !stays?.length || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return json(200, { available: false, reason: "no_location" });
    }

    // Only coordinates go to MET Norway.
    const headers: Record<string, string> = { "User-Agent": USER_AGENT };
    if (cache?.last_modified) headers["If-Modified-Since"] = cache.last_modified;
    const res = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${roundCoord(lat)}&lon=${roundCoord(lon)}`,
      { headers },
    );
    const expiresAt = expiryFrom(res.headers.get("Expires"), now);

    if (res.status === 304 && cache) {
      await res.text();
      await db.from("trip_weather_cache").update({ expires_at: expiresAt }).eq("trip_id", tripId);
      return json(200, cache.payload);
    }
    if (!res.ok) {
      await res.text();
      return cache ? json(200, cache.payload) : json(200, { available: false, reason: "unavailable" });
    }

    const met = await res.json();
    const series: MetEntry[] = met?.properties?.timeseries || [];
    const payload = {
      available: true,
      fetched_at: now.toISOString(),
      days: dailyForecast(series, trip.timezone, trip.start_date!, trip.end_date),
    };
    await db.from("trip_weather_cache").upsert({
      trip_id: tripId, fetched_at: payload.fetched_at, expires_at: expiresAt,
      last_modified: res.headers.get("Last-Modified"), payload,
    });
    return json(200, payload);
  } catch (error) {
    console.error("trip-weather error:", error instanceof Error ? error.message : error);
    return json(200, { available: false, reason: "unavailable" });
  }
});
