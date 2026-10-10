import { supabase } from "@/integrations/supabase/client";
import { createDecisionWithOptions } from "@/features/together/data";
import { localInputToIso } from "./presentation";
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
    title: ACCOMMODATION_DECISION_TITLE,
    description: "Shortlist gevonden via zoeken. Prijzen zijn indicaties, controleer altijd de aanbieder.",
    options: candidates.map((candidate) => ({
      label: candidate.name.slice(0, 120),
      description: [candidateFacts(candidate), candidate.url].filter(Boolean).join(" — ").slice(0, 400),
    })),
  });
}

export const ACCOMMODATION_DECISION_TITLE = "Waar verblijven we?";

/** Search candidates are ideas; only an explicit choice ("Dit wordt het" or a vote winner) becomes planned. */
export function candidateStayStatus(chosen: boolean): "idea" | "planned" {
  return chosen ? "planned" : "idea";
}

/** The option with the most votes (first on a tie), with the offer url from its description. */
export function decisionWinner<T extends { label: string; description: string | null; votes: unknown[] }>(options: T[]) {
  let best: T | null = null;
  for (const option of options) if (option.votes.length > 0 && (!best || option.votes.length > best.votes.length)) best = option;
  if (!best) return null;
  const url = /(https?:\/\/\S+)/.exec(best.description || "")?.[1] || null;
  return { option: best, url };
}

/** Puts one candidate on the timeline as a stay: an idea by default, planned when chosen. */
export async function addCandidateAsStay(
  tripId: string,
  candidate: AccommodationCandidate,
  period: { startDate: string; endDate: string },
  status: "idea" | "planned" = candidateStayStatus(false),
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

  await supabase.from("trip_items").update({ status, booking_url: candidate.url }).eq("id", itemId);
  return itemId;
}

/** Closed "Waar verblijven we?": the winner becomes a planned stay on the current trip dates; matching ideas go. */
export async function promoteDecisionWinner(
  tripId: string,
  option: { label: string; description: string | null },
  url: string | null,
  period: { startDate: string; endDate: string },
) {
  const itemId = await addCandidateAsStay(
    tripId,
    { name: option.label, location: null, price: null, currency: null, price_note: null, url: url || "", source: "web", summary: null },
    period,
    candidateStayStatus(true),
  );
  if (url) {
    await supabase.from("trip_items").delete()
      .eq("trip_id", tripId).eq("type", "stay").eq("status", "idea").eq("booking_url", url);
  }
  return itemId;
}

/** "Dit wordt het" on an idea: planned; stays move onto the current trip dates (check-in 15:00, out 11:00). */
export function chosenIdeaUpdate(
  item: { type: string },
  trip: { start_date: string | null; end_date: string | null },
  timezone: string,
) {
  const update: { status: "idea" | "planned"; start_at?: string | null; end_at?: string | null } = { status: candidateStayStatus(true) };
  if (item.type === "stay" && trip.start_date && trip.end_date) {
    update.start_at = localInputToIso(`${trip.start_date}T15:00`, timezone);
    update.end_at = localInputToIso(`${trip.end_date}T11:00`, timezone);
  }
  return update;
}

export async function chooseIdeaItem(
  trip: { id: string; start_date: string | null; end_date: string | null },
  item: { id: string; type: string },
  timezone: string,
) {
  const { error } = await supabase.from("trip_items").update(chosenIdeaUpdate(item, trip, timezone)).eq("id", item.id).eq("trip_id", trip.id);
  if (error) throw error;
}

type IdeaLike = { id: string; type: string; status: string };

/** Choosing a stay idea makes it the stay: the other stay ideas go. Other idea types may be chosen many times. */
export function ideasRemovedByChoice<T extends IdeaLike>(chosen: IdeaLike, items: T[]): T[] {
  if (chosen.type !== "stay") return [];
  return items.filter((item) => item.id !== chosen.id && item.type === "stay" && item.status === "idea");
}

/** The open "Waar verblijven we?" choice that a chosen stay settles, if any. */
export function accommodationDecisionClosedByChoice<T extends { title: string; status: string }>(chosen: { type: string }, decisions: T[]): T | null {
  if (chosen.type !== "stay") return null;
  return decisions.find((d) => d.status === "open" && d.title.trim() === ACCOMMODATION_DECISION_TITLE) || null;
}

export type ChoiceUndo = {
  item: { id: string; status: string; start_at: string | null; end_at: string | null };
  removed: Array<Record<string, unknown>>;
  closed_decision_id: string | null;
};

/** "Dit wordt het": one server transaction, organizer or platform admin only. Returns the undo payload. */
export async function chooseTripIdea(itemId: string): Promise<ChoiceUndo> {
  const { data, error } = await supabase.rpc("choose_trip_idea", { p_item_id: itemId });
  if (error) throw error;
  return data as unknown as ChoiceUndo;
}

/** Puts everything back; the server accepts this for 10 minutes after the choice. */
export async function undoTripIdeaChoice(tripId: string, undo: ChoiceUndo) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.rpc("undo_trip_idea_choice", { p_trip_id: tripId, p_payload: undo as any });
  if (error) throw error;
}
