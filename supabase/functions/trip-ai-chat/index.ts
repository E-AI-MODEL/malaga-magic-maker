import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_PROMPT = `Je bent de AI Reisgids van Vakansie, een slimme assistent voor groepsreizen. Je helpt een groep van {{group_size}} personen die naar de Costa del Sol (Málaga regio) gaan.

## Tripgegevens
- Naam: {{trip_name}}
- Data: {{start_date}} t/m {{end_date}}
- Groepsgrootte: {{group_size}}
- Golf: {{golf_min}}-{{golf_max}} rondes gepland
{{location_block}}
## Groepsvoorkeuren
- Gemiddeld budget: {{avg_budget}}
- Dieetwensen: {{diets}}
- Populaire activiteiten: {{activities}}
- Vervoersvoorkeur: {{mobility}}
- Aantal ingevulde intakes: {{submissions_count}}

## Accommodaties (actief)
{{accommodations_list}}

## Takenstatus
{{completed_tasks}}
{{open_tasks}}

## Instructies
- Antwoord ALTIJD in het Nederlands
- Wees concreet: noem specifieke restaurants, stranden, golfbanen, activiteiten met namen, adressen en geschatte prijzen
- Focus op de Costa del Sol regio (Málaga, Mijas, Fuengirola, Marbella, Benalmádena, Nerja, etc.)
- Houd rekening met het groepsprofiel (budget, dieet, activiteiten, vervoersvoorkeur)
- Als de verblijflocatie is ingesteld, gebruik die als basis voor afstanden en aanbevelingen
- Als je iets niet zeker weet, zeg dat eerlijk

## BELANGRIJK: Output format
- Begin met een korte inleiding van MAX 2 zinnen
- Gebruik daarna voor ELKE tip/suggestie een ## heading met een korte titel
- Heading format: "## 1. Korte titel in kleine letters" (bijv. "## 1. El Oceano Beach" of "## 3. Mercadona supermarkt")
- Gebruik GEEN onnodige hoofdletters in headings. Alleen eigennamen krijgen een hoofdletter. FOUT: "## 1. Gastronomie: TheFork & TripAdvisor". GOED: "## 1. TheFork & TripAdvisor"
- Houd headings kort (max 5 woorden) zodat ze op één regel passen op een telefoon
- Onder elke heading: max 3-4 regels met de kern (type keuken, sfeer, prijs, adres)
- Eindig optioneel met een korte ## Tip sectie (1-2 zinnen)
- Gebruik GEEN lange beschrijvingen. Wees bondig en scanbaar.
- Totaal max 300 woorden`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, tripId, disabledContexts = [] } = await req.json();
    if (!tripId) throw new Error("tripId is required");

    // Fetch group context using service role
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [tripRes, subsRes, accomRes, tasksRes, profilesRes, locationRes, promptRes] = await Promise.all([
      db.from("trip").select("*").eq("id", tripId).single(),
      db.from("submissions").select("*").eq("trip_id", tripId),
      db.from("accommodations").select("name, location_label, status, tags, type, total_price_3_nights, bedrooms, max_guests, golf_km, golf_minutes, beach_meters, agp_minutes").eq("trip_id", tripId).eq("status", "active"),
      db.from("tasks").select("title, section, progress, assigned_to, status").eq("trip_id", tripId),
      db.from("trip_members").select("user_id").eq("trip_id", tripId),
      db.from("app_settings").select("value").eq("key", "ai_guide_location").single(),
      db.from("app_settings").select("value").eq("key", "ai_guide_prompt").single(),
    ]);

    const trip = tripRes.data;
    const submissions = subsRes.data || [];
    const accommodations = accomRes.data || [];
    const tasks = tasksRes.data || [];
    const chosenLocation = locationRes.data?.value || null;
    const customPrompt = promptRes.data?.value || null;

    // Build context values
    const budgets = submissions.map((s: any) => s.budget_cap_total).filter(Boolean);
    const avgBudget = budgets.length ? Math.round(budgets.reduce((a: number, b: number) => a + b, 0) / budgets.length) : null;

    const allDiets = submissions.flatMap((s: any) => s.diet_preferences || []);
    const uniqueDiets = [...new Set(allDiets)];

    const allActivities = submissions.flatMap((s: any) => s.activities || []);
    const activityCounts: Record<string, number> = {};
    allActivities.forEach((a: string) => { activityCounts[a] = (activityCounts[a] || 0) + 1; });
    const topActivities = Object.entries(activityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);

    const completedTasks = tasks.filter((t: any) => t.progress === 100).map((t: any) => t.title);
    const openTasks = tasks.filter((t: any) => t.progress < 100).map((t: any) => t.title);

    const mobilityCounts: Record<string, number> = {};
    submissions.forEach((s: any) => { mobilityCounts[s.mobility_choice] = (mobilityCounts[s.mobility_choice] || 0) + 1; });
    const mobilityPref = Object.entries(mobilityCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v}x)`).join(", ");

    const locationBlock = chosenLocation
      ? `\n## Verblijflocatie (door admin ingesteld)\n${chosenLocation}\nGebruik deze locatie als uitgangspunt voor ALLE aanbevelingen: restaurants, stranden, vervoer, golfbanen, activiteiten. Bereken afstanden en reistijden altijd vanaf deze locatie.\n`
      : "";

    const accommodationsList = accommodations.length
      ? accommodations.map((a: any) => `- ${a.name} (${a.location_label}, ${a.type}, ${a.bedrooms} slaapkamers, max ${a.max_guests} gasten${a.total_price_3_nights ? `, €${a.total_price_3_nights}/3 nachten` : ""}${a.golf_minutes ? `, golf ${a.golf_minutes} min` : ""}${a.beach_meters ? `, strand ${a.beach_meters}m` : ""}${a.agp_minutes ? `, vliegveld ${a.agp_minutes} min` : ""})`).join("\n")
      : "Nog geen accommodaties geselecteerd";

    // Template variable replacements
    const vars: Record<string, string> = {
      group_size: String(trip?.group_size || "?"),
      trip_name: trip?.name || "Onbekend",
      start_date: trip?.start_date || "?",
      end_date: trip?.end_date || "?",
      golf_min: String(trip?.golf_min || "?"),
      golf_max: String(trip?.golf_max || "?"),
      location_block: locationBlock,
      avg_budget: avgBudget ? `€${avgBudget} totaal` : "Niet opgegeven",
      diets: uniqueDiets.length ? uniqueDiets.join(", ") : "Geen bijzonderheden",
      activities: topActivities.length ? topActivities.join(", ") : "Niet opgegeven",
      mobility: mobilityPref || "Niet opgegeven",
      submissions_count: String(submissions.length),
      accommodations_list: accommodationsList,
      completed_tasks: completedTasks.length ? `Afgerond: ${completedTasks.join(", ")}` : "Nog niets afgerond",
      open_tasks: openTasks.length ? `Open: ${openTasks.join(", ")}` : "",
    };

    // Use custom prompt or fallback, then interpolate
    let systemPrompt = customPrompt || FALLBACK_PROMPT;
    for (const [key, value] of Object.entries(vars)) {
      systemPrompt = systemPrompt.replaceAll(`{{${key}}}`, value);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het zo opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-tegoed op, neem contact op met de beheerder." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI is even niet beschikbaar." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("trip-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
