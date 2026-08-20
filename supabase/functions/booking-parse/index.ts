import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const MAX_TEXT = 16000;

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: jsonHeaders });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const PARSE_PROMPT = `Je leest de tekst van een doorgestuurde boekingsmail (vlucht, trein, hotel, huurauto, activiteit of restaurant).

Geef UITSLUITEND geldige JSON terug, zonder codeblok, met exact deze vorm:
{
  "summary": "een zin in het Nederlands die zegt wat er geboekt is",
  "suggestions": [
    {
      "type": "flight|train|ferry|bus|stay|car_rental|transfer|activity|restaurant|event|ticket|other",
      "title": "korte titel, bijv. 'Vlucht KL1699 Amsterdam - Malaga'",
      "start_at": "ISO 8601 met tijd of null",
      "end_at": "ISO 8601 met tijd of null",
      "location_name": "vertrekpunt, hotelnaam of locatie, of null",
      "address": "adres of null",
      "provider": "maatschappij/aanbieder of null",
      "booking_reference": "boekingsnummer of null",
      "price": getal of null,
      "currency": "ISO-valuta of null"
    }
  ]
}

Regels:
- Verzin niets. Laat een veld null als het niet letterlijk in de tekst staat.
- Heen- en terugreis zijn twee losse suggesties.
- Maximaal 6 suggesties. Geef een lege lijst als er geen concrete boeking in staat.
- Datums zonder jaartal: laat start_at null.
- Antwoord alleen met de JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!lovableApiKey || !supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("booking-parse missing server configuration");
      return jsonError(500, "Uitlezen is even niet beschikbaar.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError(401, "Unauthorized");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authHeader.slice("Bearer ".length);
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
    if (claimsError || !userId) return jsonError(401, "Unauthorized");

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return jsonError(400, "Invalid request");
    const tripId = body.tripId;
    const rawText = typeof body.text === "string" ? body.text.trim() : "";
    if (!isUuid(tripId)) return jsonError(400, "tripId is required");
    if (rawText.length < 20) return jsonError(400, "Plak wat meer tekst uit de boekingsmail.");
    const text = rawText.slice(0, MAX_TEXT);

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // SECURITY BOUNDARY: service-role bypasses RLS. Membership is verified first.
    const { data: membership, error: membershipError } = await db
      .from("trip_members")
      .select("trip_id")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    if (membershipError) {
      console.error("booking-parse membership check failed:", membershipError.message);
      return jsonError(500, "Authorization check failed");
    }
    if (!membership) return jsonError(403, "Forbidden");

    const { data: quota, error: quotaError } = await userClient.rpc("consume_hansie_quota", { p_trip_id: tripId });
    if (quotaError) {
      console.error("booking-parse quota check failed:", quotaError.message);
      return jsonError(500, "Uitlezen is even niet beschikbaar.");
    }
    if ((quota as Record<string, unknown> | null)?.allowed === false) {
      return jsonError(429, "Je hebt het dagmaximum van Hansie bereikt. Probeer het later opnieuw.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: PARSE_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("booking-parse ai error:", response.status, detail.slice(0, 400));
      if (response.status === 429) return jsonError(429, "Te veel verzoeken, probeer het zo opnieuw.");
      if (response.status === 402) return jsonError(402, "Uitlezen is tijdelijk niet beschikbaar.");
      return jsonError(500, "De boeking kon niet worden uitgelezen.");
    }

    const payload = await response.json().catch(() => null);
    const raw = payload?.choices?.[0]?.message?.content;
    const output = typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((part: Record<string, unknown>) => (typeof part?.text === "string" ? part.text : "")).join("")
        : "";

    let parsed: Record<string, unknown> | null = null;
    const match = output.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
    }
    if (!parsed) {
      console.error("booking-parse could not parse model output");
      return jsonError(500, "De boeking kon niet worden uitgelezen.");
    }

    const summary = typeof parsed.summary === "string" ? parsed.summary.slice(0, 400) : null;
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((entry) => entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).title === "string").slice(0, 6)
      : [];

    return new Response(JSON.stringify({ ok: true, summary, suggestions }), { headers: jsonHeaders });
  } catch (error) {
    console.error("booking-parse error:", error instanceof Error ? error.message : error);
    return jsonError(500, "Uitlezen is even niet beschikbaar.");
  }
});
