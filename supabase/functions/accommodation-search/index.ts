import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isSafePublicHttpsUrl } from "../_shared/url-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

// Connection keys starting with "lovc_" go through the Lovable connector
// gateway; real Firecrawl keys ("fc-") call the provider directly.
function firecrawlRequest(apiKey: string, path: string, body: unknown) {
  const viaGateway = apiKey.startsWith("lovc_");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
  const base = viaGateway ? "https://connector-gateway.lovable.dev/firecrawl/v2" : "https://api.firecrawl.dev/v2";
  const headers: Record<string, string> = viaGateway
    ? { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": apiKey, "Content-Type": "application/json" }
    : { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  return fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

/** Bronnen die de gebruiker kan aanvinken. Airbnb blokkeert crawlers vaak; dat is geen fout. */
const SOURCES: Record<string, { label: string; site: string | null }> = {
  booking: { label: "Booking.com", site: "booking.com" },
  airbnb: { label: "Airbnb", site: "airbnb.nl OR site:airbnb.com" },
  micazu: { label: "Micazu", site: "micazu.nl OR site:belvilla.nl OR site:natuurhuisje.nl" },
  web: { label: "Web", site: null },
};

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: jsonHeaders });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function clampText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const NORMALISE_PROMPT =
  `Je krijgt ruwe zoekresultaten van accommodatiesites. Geef UITSLUITEND geldige JSON terug, zonder codeblok:
{
  "candidates": [
    {
      "name": "naam van de accommodatie",
      "location": "plaats of buurt, of null",
      "price": getal of null,
      "currency": "ISO-valuta of null",
      "price_note": "waar de prijs voor geldt, bijv. 'per nacht', of null",
      "url": "directe link naar de aanbieding",
      "source": "booking|airbnb|micazu|web",
      "summary": "één korte zin in het Nederlands, of null"
    }
  ]
}

Regels:
- Verzin niets. Laat een veld null als het niet in de tekst staat. Prijzen zijn indicaties.
- Sla zoekpagina's, categoriepagina's en reisblogs over; alleen concrete accommodaties.
- Maximaal 12 kandidaten, geen dubbele URL's.
- Antwoord alleen met de JSON.`;

async function callModel(lovableApiKey: string, systemPrompt: string, userContent: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("accommodation-search ai error:", response.status, detail.slice(0, 400));
    if (response.status === 429) throw new Response(null, { status: 429 });
    if (response.status === 402) throw new Response(null, { status: 402 });
    throw new Response(null, { status: 500 });
  }

  const payload = await response.json().catch(() => null);
  const raw = payload?.choices?.[0]?.message?.content;
  const output = typeof raw === "string"
    ? raw
    : Array.isArray(raw)
      ? raw.map((part: Record<string, unknown>) => (typeof part?.text === "string" ? part.text : "")).join("")
      : "";

  const match = output.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normaliseCandidates(value: unknown, fallbackSource: string) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const name = clampText(candidate.name, 160);
    const url = clampText(candidate.url, 600);
    if (!name || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({
      name,
      location: clampText(candidate.location, 120) || null,
      price: typeof candidate.price === "number" && Number.isFinite(candidate.price) ? candidate.price : null,
      currency: clampText(candidate.currency, 8).toUpperCase() || null,
      price_note: clampText(candidate.price_note, 80) || null,
      url,
      source: clampText(candidate.source, 20) || fallbackSource,
      summary: clampText(candidate.summary, 240) || null,
      image_url: /^https?:\/\//i.test(clampText(candidate.image_url, 600))
        ? clampText(candidate.image_url, 600)
        : null,
    });
    if (out.length >= 12) break;
  }
  return out;
}

async function firecrawlSearch(apiKey: string, query: string) {
  const response = await firecrawlRequest(apiKey, "/search", { query, limit: 6, scrapeOptions: { formats: ["markdown"] } });
  if (!response.ok) {
    const detail = await response.text();
    console.error("firecrawl search failed:", response.status, detail.slice(0, 300));
    return [] as Array<Record<string, unknown>>;
  }
  const payload = await response.json().catch(() => null);
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.web)
      ? payload.data.web
      : [];
  return rows as Array<Record<string, unknown>>;
}

async function firecrawlScrape(apiKey: string, url: string) {
  const response = await firecrawlRequest(apiKey, "/scrape", { url, formats: ["markdown"], onlyMainContent: true });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("firecrawl scrape failed:", response.status, JSON.stringify(payload).slice(0, 300));
    return null;
  }
  const markdown = typeof payload?.markdown === "string" ? payload.markdown : payload?.data?.markdown;
  const metadata = payload?.metadata ?? payload?.data?.metadata ?? {};
  return { markdown: typeof markdown === "string" ? markdown : "", metadata };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!lovableApiKey || !supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("accommodation-search missing server configuration");
      return jsonError(500, "Zoeken is even niet beschikbaar.");
    }
    if (!firecrawlKey) {
      return jsonError(503, "Zoeken naar accommodaties is nog niet geconfigureerd.");
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
    if (!isUuid(tripId)) return jsonError(400, "tripId is required");
    const mode = body.mode === "lookup" ? "lookup" : "search";

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
      console.error("accommodation-search membership check failed:", membershipError.message);
      return jsonError(500, "Authorization check failed");
    }
    if (!membership) return jsonError(403, "Forbidden");

    const { data: quota, error: quotaError } = await userClient.rpc("consume_hansie_quota", { p_trip_id: tripId });
    if (quotaError) {
      console.error("accommodation-search quota check failed:", quotaError.message);
      return jsonError(500, "Zoeken is even niet beschikbaar.");
    }
    if ((quota as Record<string, unknown> | null)?.allowed === false) {
      return jsonError(429, "Je hebt het dagmaximum van Hansie bereikt. Probeer het later opnieuw.");
    }

    if (mode === "lookup") {
      const url = clampText(body.url, 600);
      if (!isSafePublicHttpsUrl(url)) return jsonError(400, "Plak een volledige link (https://…).");

      const scraped = await firecrawlScrape(firecrawlKey, url);
      if (!scraped || !scraped.markdown) {
        return jsonError(422, "Deze aanbieder blokkeert automatisch uitlezen. Vul de gegevens handmatig in.");
      }

      const parsed = await callModel(
        lovableApiKey,
        NORMALISE_PROMPT,
        `Bron-URL: ${url}\nTitel: ${clampText((scraped.metadata as Record<string, unknown>)?.title, 200)}\n\n${scraped.markdown.slice(0, 12000)}`,
      );
      const candidates = normaliseCandidates(parsed?.candidates, "web").map((candidate) => ({ ...candidate, url }));
      if (candidates.length === 0) {
        return jsonError(422, "Uit deze pagina kwam geen accommodatie. Vul de gegevens handmatig in.");
      }
      return new Response(JSON.stringify({ ok: true, candidates: candidates.slice(0, 1) }), { headers: jsonHeaders });
    }

    const destination = clampText(body.destination, 120);
    if (!destination) return jsonError(400, "Vul een bestemming in.");
    const requestedSources = Array.isArray(body.sources)
      ? body.sources.map((value) => clampText(value, 20)).filter((value) => value in SOURCES)
      : [];
    const sources = (requestedSources.length > 0 ? requestedSources : ["booking", "web"]).slice(0, 4);

    const guests = typeof body.guests === "number" && body.guests > 0 ? Math.min(Math.round(body.guests), 30) : null;
    const budget = typeof body.budget === "number" && body.budget > 0 ? Math.round(body.budget) : null;
    const startDate = clampText(body.startDate, 10);
    const endDate = clampText(body.endDate, 10);
    const wishes = clampText(body.wishes, 200);

    const baseQuery = [
      "accommodatie",
      destination,
      guests ? `${guests} personen` : "",
      budget ? `tot ${budget} euro` : "",
      wishes,
    ].filter(Boolean).join(" ");

    const perSource = await Promise.all(sources.map(async (key) => {
      const site = SOURCES[key].site;
      const query = site ? `${baseQuery} site:${site}` : `${baseQuery} vakantiehuis OR appartement OR hotel`;
      const rows = await firecrawlSearch(firecrawlKey, query);
      return { key, rows };
    }));

    const context = perSource
      .flatMap(({ key, rows }) =>
        rows.map((row) => {
          const markdown = typeof row.markdown === "string" ? row.markdown.slice(0, 1500) : "";
          return `--- bron: ${key}\nURL: ${clampText(row.url, 400)}\nTitel: ${clampText(row.title, 200)}\n${clampText(row.description, 300)}\n${markdown}`;
        })
      )
      .join("\n\n")
      .slice(0, 40000);

    const emptySources = perSource.filter(({ rows }) => rows.length === 0).map(({ key }) => SOURCES[key].label);

    if (!context.trim()) {
      return new Response(
        JSON.stringify({ ok: true, candidates: [], emptySources, period: { startDate, endDate } }),
        { headers: jsonHeaders },
      );
    }

    const parsed = await callModel(
      lovableApiKey,
      NORMALISE_PROMPT,
      `Bestemming: ${destination}\nPeriode: ${startDate || "onbekend"} tot ${endDate || "onbekend"}\nReizigers: ${guests ?? "onbekend"}\nBudget: ${budget ?? "onbekend"}\nWensen: ${wishes || "geen"}\n\n${context}`,
    );

    const candidates = normaliseCandidates(parsed?.candidates, "web");
    return new Response(
      JSON.stringify({ ok: true, candidates, emptySources, period: { startDate, endDate } }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 429) return jsonError(429, "Te veel verzoeken, probeer het zo opnieuw.");
      if (error.status === 402) return jsonError(402, "Zoeken is tijdelijk niet beschikbaar.");
      return jsonError(500, "Zoeken lukte niet. Probeer het zo opnieuw.");
    }
    console.error("accommodation-search error:", error instanceof Error ? error.message : error);
    return jsonError(500, "Zoeken is even niet beschikbaar.");
  }
});
