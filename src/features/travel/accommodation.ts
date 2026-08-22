import { supabase } from "@/integrations/supabase/client";
import { createDecisionWithOptions } from "@/features/together/data";
import { createItemFromSuggestion, type DocumentSuggestion } from "@/features/documents/data";

export type AccommodationSource = "booking" | "airbnb" | "micazu" | "web";

export const accommodationSources: ReadonlyArray<{ id: AccommodationSource; label: string }> = [
  { id: "booking", label: "Booking.com" },
  { id: "airbnb", label: "Airbnb" },
  { id: "micazu", label: "Micazu / vakantiehuizen" },
  { id: "web", label: "Algemeen web" },
];

export type AccommodationCandidate = {
  name: string;
  location: string | null;
  price: number | null;
  currency: string | null;
  price_note: string | null;
  url: string;
  source: string;
  summary: string | null;
};

export type AccommodationSearchResult = {
  candidates: AccommodationCandidate[];
  emptySources: string[];
  period: { startDate: string; endDate: string };
};

type SearchInput = {
  tripId: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  guests?: number | null;
  budget?: number | null;
  wishes?: string;
  sources: AccommodationSource[];
};

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("accommodation-search", { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const detail = await context.text().catch(() => "");
      try {
        const parsed = JSON.parse(detail) as { error?: string };
        if (parsed?.error) throw new Error(parsed.error);
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message && !detail.startsWith("{")) {
          throw new Error(parseError.message);
        }
      }
    }
    throw new Error(error.message || "Zoeken lukte niet.");
  }
  return (data || {}) as Partial<AccommodationSearchResult>;
}

export async function searchAccommodations(input: SearchInput): Promise<AccommodationSearchResult> {
  const data = await invoke({
    mode: "search",
    tripId: input.tripId,
    destination: input.destination,
    startDate: input.startDate || "",
    endDate: input.endDate || "",
    guests: input.guests ?? null,
    budget: input.budget ?? null,
    wishes: input.wishes || "",
    sources: input.sources,
  });
  return {
    candidates: data.candidates || [],
    emptySources: data.emptySources || [],
    period: data.period || { startDate: "", endDate: "" },
  };
}

export async function lookupAccommodationUrl(tripId: string, url: string): Promise<AccommodationCandidate | null> {
  const data = await invoke({ mode: "lookup", tripId, url });
  return data.candidates?.[0] || null;
}

export function candidateFacts(candidate: AccommodationCandidate) {
  const price = candidate.price
    ? `${candidate.currency || "EUR"} ${Math.round(candidate.price)}${candidate.price_note ? ` ${candidate.price_note}` : ""}`
    : null;
  return [candidate.location, price].filter(Boolean).join(" · ");
}

/** Puts a shortlist of candidates up for a group vote in Samen. */
export async function createAccommodationDecision(tripId: string, candidates: AccommodationCandidate[]) {
  return createDecisionWithOptions({
    tripId,
    title: "Waar verblijven we?",
    description: "Shortlist gevonden via zoeken. Prijzen zijn indicaties, controleer altijd de aanbieder.",
    options: candidates.map((candidate) => ({
      label: candidate.name.slice(0, 120),
      description: [candidateFacts(candidate), candidate.url].filter(Boolean).join(" — ").slice(0, 400),
    })),
  });
}

/** Puts one candidate on the timeline as a stay. */
export async function addCandidateAsStay(
  tripId: string,
  candidate: AccommodationCandidate,
  period: { startDate: string; endDate: string },
) {
  const itemId = await createItemFromSuggestion(
    tripId,
    {
      type: "stay",
      title: candidate.name,
      start_at: period.startDate ? `${period.startDate}T15:00:00` : null,
      end_at: period.endDate ? `${period.endDate}T11:00:00` : null,
      location_name: candidate.location,
      address: null,
      provider: candidate.source === "web" ? null : candidate.source,
      booking_reference: null,
      price: candidate.price,
      currency: candidate.currency,
    } satisfies DocumentSuggestion,
    `Gevonden via zoeken — ${candidate.url}`,
  );

  await supabase.from("trip_items").update({ status: "planned", booking_url: candidate.url }).eq("id", itemId);
  return itemId;
}
