import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_TEXT = 8000;
const SUPPORTED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: jsonHeaders });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const EXTRACT_PROMPT = `Je leest een reisdocument (ticket, boekingsbevestiging, voucher of verzekering).

Geef UITSLUITEND geldige JSON terug, zonder codeblok, met exact deze vorm:
{
  "summary": "een zin in het Nederlands die zegt wat dit document is",
  "text": "de relevante tekst uit het document, platte tekst, maximaal 4000 tekens",
  "suggestion": null of {
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
}

Regels:
- Verzin niets. Laat een veld null als het niet letterlijk in het document staat.
- Gebruik "suggestion": null als het document geen concreet reisonderdeel beschrijft.
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
      console.error("document-extract missing server configuration");
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
    const documentId = body.documentId;
    const action = body.action === "dismiss" ? "dismiss" : "extract";
    if (!isUuid(tripId) || !isUuid(documentId)) return jsonError(400, "tripId and documentId are required");

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // SECURITY BOUNDARY: service-role bypasses RLS. Nothing private is read or
    // written before this exact user/trip membership check succeeds.
    const { data: membership, error: membershipError } = await db
      .from("trip_members")
      .select("trip_id")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    if (membershipError) {
      console.error("document-extract membership check failed:", membershipError.message);
      return jsonError(500, "Authorization check failed");
    }
    if (!membership) return jsonError(403, "Forbidden");

    const { data: document, error: documentError } = await db
      .from("trip_documents")
      .select("id, trip_id, filename, mime_type, storage_path, status, size_bytes, extraction_status")
      .eq("id", documentId)
      .eq("trip_id", tripId)
      .maybeSingle();
    if (documentError) {
      console.error("document-extract document load failed:", documentError.message);
      return jsonError(500, "Document kon niet worden geladen.");
    }
    if (!document) return jsonError(404, "Document niet gevonden.");

    if (action === "dismiss") {
      const { error } = await db
        .from("trip_documents")
        .update({ extracted_suggestion: null })
        .eq("id", documentId)
        .eq("trip_id", tripId);
      if (error) {
        console.error("document-extract dismiss failed:", error.message);
        return jsonError(500, "Suggestie kon niet worden opgeruimd.");
      }
      return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
    }

    if (document.status !== "ready") return jsonError(409, "Document is nog niet klaar.");
    if (!SUPPORTED.has(document.mime_type)) {
      await db.from("trip_documents").update({ extraction_status: "skipped" }).eq("id", documentId);
      return jsonError(415, "Dit bestandstype kan niet worden uitgelezen.");
    }
    if ((document.size_bytes ?? 0) > MAX_BYTES) return jsonError(413, "Dit bestand is te groot om uit te lezen.");

    // Plan quota + abuse limit, in the caller's authenticated context.
    const { data: quota, error: quotaError } = await userClient.rpc("consume_hansie_quota", { p_trip_id: tripId });
    if (quotaError) {
      console.error("document-extract quota check failed:", quotaError.message);
      return jsonError(500, "Uitlezen is even niet beschikbaar.");
    }
    if ((quota as Record<string, unknown> | null)?.allowed === false) {
      return jsonError(429, "Je hebt het dagmaximum van Hansie bereikt. Probeer het later opnieuw.");
    }

    await db.from("trip_documents").update({ extraction_status: "processing" }).eq("id", documentId);

    const markFailed = async () => {
      await db.from("trip_documents").update({ extraction_status: "failed", extracted_at: new Date().toISOString() }).eq("id", documentId);
    };

    const download = await db.storage.from("trip-documents").download(document.storage_path);
    if (download.error || !download.data) {
      console.error("document-extract download failed:", download.error?.message);
      await markFailed();
      return jsonError(500, "Het bestand kon niet worden gelezen.");
    }

    const bytes = new Uint8Array(await download.data.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      await markFailed();
      return jsonError(413, "Het bestand kon niet worden uitgelezen.");
    }
    const dataUrl = `data:${document.mime_type};base64,${toBase64(bytes)}`;

    const contentBlock = document.mime_type === "application/pdf"
      ? { type: "file", file: { filename: document.filename, file_data: dataUrl } }
      : { type: "image_url", image_url: { url: dataUrl } };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: EXTRACT_PROMPT },
          { role: "user", content: [{ type: "text", text: `Bestandsnaam: ${document.filename}` }, contentBlock] },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("document-extract ai error:", response.status, detail.slice(0, 400));
      await markFailed();
      if (response.status === 429) return jsonError(429, "Te veel verzoeken, probeer het zo opnieuw.");
      if (response.status === 402) return jsonError(402, "Uitlezen is tijdelijk niet beschikbaar.");
      return jsonError(500, "Het document kon niet worden uitgelezen.");
    }

    const payload = await response.json().catch(() => null);
    const raw = payload?.choices?.[0]?.message?.content;
    const text = typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((part: Record<string, unknown>) => (typeof part?.text === "string" ? part.text : "")).join("")
        : "";

    let parsed: Record<string, unknown> | null = null;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
    }
    if (!parsed) {
      console.error("document-extract could not parse model output");
      await markFailed();
      return jsonError(500, "Het document kon niet worden uitgelezen.");
    }

    const summary = typeof parsed.summary === "string" ? parsed.summary.slice(0, 400) : null;
    const extractedText = typeof parsed.text === "string" ? parsed.text.slice(0, MAX_TEXT) : null;
    const suggestion = parsed.suggestion && typeof parsed.suggestion === "object" ? parsed.suggestion : null;

    const { error: saveError } = await db
      .from("trip_documents")
      .update({
        extraction_status: "done",
        extracted_summary: summary,
        extracted_text: extractedText,
        extracted_suggestion: suggestion,
        extracted_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("trip_id", tripId);

    if (saveError) {
      console.error("document-extract save failed:", saveError.message);
      await markFailed();
      return jsonError(500, "De uitgelezen gegevens konden niet worden bewaard.");
    }

    return new Response(JSON.stringify({ ok: true, summary, suggestion }), { headers: jsonHeaders });
  } catch (error) {
    console.error("document-extract error:", error instanceof Error ? error.message : error);
    return jsonError(500, "Uitlezen is even niet beschikbaar.");
  }
});
