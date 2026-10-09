import { supabase } from "@/integrations/supabase/client";

export type TravelerProfile = {
  id: string;
  trip_id: string;
  user_id: string;
  priorities: string[];
  diet: string[];
  allergies: string | null;
  health_consent_at: string | null;
  pace: string | null;
  comfort: string | null;
  budget_feel: string | null;
  mobility: string | null;
  notes: string | null;
};

export type TravelerProfileInput = {
  tripId: string;
  userId: string;
  priorities: string[];
  diet: string[];
  allergies?: string | null;
  /** Explicit consent to share diet and allergies; without it both are cleared. */
  healthConsent: boolean;
  healthConsentAt?: string | null;
  pace?: string | null;
  comfort?: string | null;
  budgetFeel?: string | null;
  mobility?: string | null;
  notes?: string | null;
};

export const priorityOptions = [
  "Rust",
  "Natuur",
  "Cultuur",
  "Eten en drinken",
  "Uitgaan",
  "Sport",
  "Strand",
  "Kindvriendelijk",
  "Shoppen",
  "Wellness",
];

export const dietOptions = [
  "Vegetarisch",
  "Veganistisch",
  "Glutenvrij",
  "Lactosevrij",
  "Halal",
  "Kosher",
  "Geen alcohol",
];

export const paceOptions = ["Rustig", "Gemiddeld", "Vol programma"];
export const comfortOptions = ["Simpel", "Comfortabel", "Luxe"];
export const budgetOptions = ["Zuinig", "Gemiddeld", "Ruim"];

export const partyTypeOptions = [
  { value: "solo", label: "Alleen" },
  { value: "couple", label: "Met z'n tweeën" },
  { value: "family", label: "Gezin" },
  { value: "friends", label: "Vrienden" },
  { value: "business", label: "Zakelijk" },
];

export function partyTypeLabel(value: string | null | undefined) {
  return partyTypeOptions.find((option) => option.value === value)?.label ?? null;
}

export async function listTravelerProfiles(tripId: string): Promise<TravelerProfile[]> {
  const { data, error } = await supabase
    .from("trip_traveler_profiles")
    .select("*")
    .eq("trip_id", tripId);

  if (error) throw error;
  return (data || []) as TravelerProfile[];
}

/** Diet and allergies are health data: stored only with consent, cleared when it is withdrawn. */
export function healthFields(input: Pick<TravelerProfileInput, "diet" | "allergies" | "healthConsent" | "healthConsentAt">, now = new Date()) {
  if (!input.healthConsent) return { diet: [] as string[], allergies: null, health_consent_at: null };
  return {
    diet: input.diet,
    allergies: input.allergies?.trim() || null,
    health_consent_at: input.healthConsentAt || now.toISOString(),
  };
}

export async function saveTravelerProfile(input: TravelerProfileInput) {
  const { error } = await supabase
    .from("trip_traveler_profiles")
    .upsert(
      {
        trip_id: input.tripId,
        user_id: input.userId,
        priorities: input.priorities,
        ...healthFields(input),
        pace: input.pace || null,
        comfort: input.comfort || null,
        budget_feel: input.budgetFeel || null,
        mobility: input.mobility?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      { onConflict: "trip_id,user_id" },
    );

  if (error) throw error;
}

/** One short human line summarising a profile, or null when nothing is filled in. */
export function summariseProfile(profile: TravelerProfile | undefined): string | null {
  if (!profile) return null;
  const parts: string[] = [];
  if (profile.priorities.length) parts.push(profile.priorities.slice(0, 3).join(", "));
  if (profile.diet.length) parts.push(profile.diet.join(", "));
  if (profile.pace) parts.push(`tempo ${profile.pace.toLowerCase()}`);
  if (!parts.length && profile.notes) parts.push(profile.notes.slice(0, 60));
  return parts.length ? parts.join(" · ") : null;
}
