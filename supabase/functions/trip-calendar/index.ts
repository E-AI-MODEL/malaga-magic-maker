import { createClient } from "npm:@supabase/supabase-js@2";
import { buildTripCalendar } from "./calendar.ts";

// Same 404 for every failure, so nobody can guess which tokens exist.
const notFound = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = Deno.env.get("APP_URL");
  if (!supabaseUrl || !serviceRoleKey || !appUrl) {
    console.error("trip-calendar missing server configuration");
    return new Response("Unavailable", { status: 503 });
  }

  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return notFound();

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // The feed token is the credential: resolve it (active + owner still a member) before reading any trip data.
  const { data: tripId, error: resolveError } = await db.rpc("resolve_calendar_feed", { p_token_hash: await sha256Hex(token) });
  if (resolveError || typeof tripId !== "string") return notFound();

  const [{ data: trip }, { data: items }] = await Promise.all([
    db.from("trip").select("id, name, start_date, end_date, timezone").eq("id", tripId).maybeSingle(),
    db.from("trip_items")
      .select("id, title, status, start_at, end_at, location_name, address, provider, metadata")
      .eq("trip_id", tripId)
      .order("start_at", { ascending: true }),
  ]);
  if (!trip) return notFound();

  const body = buildTripCalendar(trip, items || [], appUrl);
  return new Response(req.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=900",
      "Content-Disposition": 'inline; filename="vakansie.ics"',
    },
  });
});
