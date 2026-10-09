import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SYSTEM_RULES } from "./system-rules.ts";
import { buildTripContext } from "./context.ts";
import { normalizeMessages } from "./messages.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: jsonHeaders });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!lovableApiKey || !supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("trip-ai-chat missing server configuration");
      return jsonError(500, "Hansie is even niet beschikbaar.");
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonError(400, "Invalid request");

    const tripId = (body as Record<string, unknown>).tripId;
    const messages = normalizeMessages((body as Record<string, unknown>).messages);
    if (!isUuid(tripId)) return jsonError(400, "tripId is required");
    if (!messages || messages.length === 0) return jsonError(400, "Valid messages are required");

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // SECURITY BOUNDARY: service-role bypasses RLS. No private trip data is read
    // until this exact user/trip membership check succeeds.
    const { data: membership, error: membershipError } = await db
      .from("trip_members")
      .select("trip_id, role")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error("trip-ai-chat membership check failed:", membershipError.message);
      return jsonError(500, "Authorization check failed");
    }
    if (!membership) return jsonError(403, "Forbidden");

    // Plan quota + abuse limit. Runs in the caller's authenticated context and
    // records the usage event itself, so it must succeed before any AI call.
    const { data: quota, error: quotaError } = await userClient.rpc("consume_hansie_quota", {
      p_trip_id: tripId,
    });
    if (quotaError) {
      console.error("trip-ai-chat quota check failed:", quotaError.message);
      return jsonError(500, "Hansie is even niet beschikbaar.");
    }
    const quotaResult = (quota ?? {}) as Record<string, unknown>;
    if (quotaResult.allowed === false) {
      const isFree = quotaResult.plan !== "pro";
      const message = quotaResult.reason === "daily_limit"
        ? (isFree
          ? `Je hebt je ${quotaResult.day_limit} Hansie-vragen van vandaag gebruikt. Met Pro krijg je er 150 per dag.`
          : "Je hebt het dagmaximum voor Hansie bereikt. Probeer het morgen opnieuw.")
        : "Even rustig aan: je stelde net veel vragen. Probeer het zo opnieuw.";
      return jsonError(429, message);
    }

    // The readiness RPC runs in the caller's authenticated context and enforces
    // its own membership check as defense in depth.
    const readinessPromise = userClient.rpc("get_trip_readiness", { p_trip_id: tripId });

    const decisionIdsRes = await db.from("decisions").select("id").eq("trip_id", tripId).limit(30);
    if (decisionIdsRes.error) {
      console.error("trip-ai-chat decisions load failed:", decisionIdsRes.error.message);
      return jsonError(500, "Reiscontext kon niet worden geladen.");
    }
    const decisionIds = decisionIdsRes.data?.length
      ? decisionIdsRes.data.map((row) => row.id)
      : ["00000000-0000-0000-0000-000000000000"];

    const [
      tripRes,
      itemsRes,
      tasksRes,
      decisionsRes,
      optionsRes,
      votesRes,
      membersRes,
      expensesRes,
      documentsRes,
      readinessRes,
    ] = await Promise.all([
      db.from("trip")
        .select("id, name, description, destination_name, destination_country, start_date, end_date, timezone, currency, status")
        .eq("id", tripId)
        .single(),
      db.from("trip_items")
        .select("id, type, title, status, start_at, end_at, timezone, location_name, provider, booking_reference, price, currency, notes")
        .eq("trip_id", tripId)
        .order("start_at", { ascending: true, nullsFirst: false })
        .limit(60),
      db.from("tasks")
        .select("id, title, description, status, progress, priority, due_at, assigned_user_id")
        .eq("trip_id", tripId)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(60),
      db.from("decisions")
        .select("id, title, description, status, closes_at")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(30),
      db.from("decision_options")
        .select("id, decision_id, label, description")
        .in("decision_id", decisionIds)
        .limit(100),
      db.from("decision_votes")
        .select("decision_id, option_id, user_id")
        .in("decision_id", decisionIds)
        .limit(500),
      db.from("trip_members")
        .select("user_id, role")
        .eq("trip_id", tripId)
        .limit(50),
      db.from("expenses")
        .select("description, amount, currency, paid_by_user_id, created_at")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(50),
      db.from("trip_documents")
        .select("filename, document_type, trip_item_id, size_bytes, ready_at, extracted_summary, extracted_text")
        .eq("trip_id", tripId)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(50),
      readinessPromise,
    ]);

    if (tripRes.error || !tripRes.data) {
      console.error("trip-ai-chat trip load failed:", tripRes.error?.message);
      return jsonError(500, "Reisgegevens konden niet worden geladen.");
    }

    for (const result of [itemsRes, tasksRes, decisionsRes, optionsRes, votesRes, membersRes, expensesRes, documentsRes]) {
      if (result.error) {
        console.error("trip-ai-chat context load failed:", result.error.message);
        return jsonError(500, "Reiscontext kon niet worden geladen.");
      }
    }
    if (readinessRes.error) {
      console.error("trip-ai-chat readiness failed:", readinessRes.error.message);
      return jsonError(500, "Voorbereidingstatus kon niet worden geladen.");
    }

    const memberIds = (membersRes.data || []).map((member) => member.user_id);
    const profilesRes = memberIds.length
      ? await db.from("profiles").select("id, display_name").in("id", memberIds).limit(50)
      : { data: [], error: null };
    if (profilesRes.error) {
      console.error("trip-ai-chat profile load failed:", profilesRes.error.message);
      return jsonError(500, "Reiscontext kon niet worden geladen.");
    }

    const travelerProfilesRes = memberIds.length
      ? await db
        .from("trip_traveler_profiles")
        .select("user_id, priorities, diet, allergies, health_consent_at, pace, comfort, budget_feel, mobility, notes")
        .eq("trip_id", tripId)
      : { data: [], error: null };
    if (travelerProfilesRes.error) {
      console.error("trip-ai-chat traveler profile load failed:", travelerProfilesRes.error.message);
      return jsonError(500, "Reiscontext kon niet worden geladen.");
    }

    const weatherRes = await db.from("trip_weather_cache").select("payload").eq("trip_id", tripId).maybeSingle();
    const weatherPayload = weatherRes.data?.payload as { available?: boolean; fetched_at?: string; days?: unknown[] } | null;
    const weather = weatherPayload?.available && weatherPayload.fetched_at && Array.isArray(weatherPayload.days)
      ? { fetched_at: weatherPayload.fetched_at, days: weatherPayload.days }
      : null;

    const context = buildTripContext({
      now: new Date(),
      userId,
      trip: tripRes.data,
      readiness: readinessRes.data,
      items: itemsRes.data || [],
      tasks: tasksRes.data || [],
      decisions: decisionsRes.data || [],
      options: optionsRes.data || [],
      votes: votesRes.data || [],
      members: membersRes.data || [],
      profiles: profilesRes.data || [],
      travelerProfiles: travelerProfilesRes.data || [],
      expenses: expensesRes.data || [],
      documents: documentsRes.data || [],
      weather,
    });

    const systemPrompt = `${SYSTEM_RULES}\n\nREISFEITEN (alleen deze geautoriseerde reis):\n${JSON.stringify(context)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonError(429, "Te veel verzoeken, probeer het zo opnieuw.");
      if (response.status === 402) return jsonError(402, "Hansie is tijdelijk niet beschikbaar.");
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText.slice(0, 500));
      return jsonError(500, "Hansie is even niet beschikbaar.");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("trip-ai-chat error:", error instanceof Error ? error.message : error);
    return jsonError(500, "Hansie is even niet beschikbaar.");
  }
});
