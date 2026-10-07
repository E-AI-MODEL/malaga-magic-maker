// Pure helpers that shape the trip facts sent to the model.
// No ids, storage paths or e-mail addresses may leave this module.

export type Fase = "nog ver weg" | "voorbereiden" | "laatste week" | "onderweg" | "afgelopen" | "onbekend";

const FALLBACK_TZ = "Europe/Amsterdam";

function validTimeZone(tz: unknown): string {
  if (typeof tz !== "string" || !tz) return FALLBACK_TZ;
  try {
    new Intl.DateTimeFormat("nl-NL", { timeZone: tz });
    return tz;
  } catch {
    return FALLBACK_TZ;
  }
}

/** "woensdag 7 oktober 2026, 14:05" in the trip time zone. */
export function formatNow(now: Date, tz: unknown): string {
  const timeZone = validTimeZone(tz);
  const date = new Intl.DateTimeFormat("nl-NL", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("nl-NL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return `${date}, ${time}`;
}

/** Calendar date (YYYY-MM-DD) of `now` in the given time zone. */
function localDate(now: Date, tz: unknown): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: validTimeZone(tz) }).format(now);
}

function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function tripTiming(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  now: Date,
  tz: unknown,
): { dagen_tot_vertrek: number | null; fase: Fase } {
  if (!startDate) return { dagen_tot_vertrek: null, fase: "onbekend" };
  const today = localDate(now, tz);
  const days = dayDiff(today, startDate.slice(0, 10));
  const end = (endDate || startDate).slice(0, 10);
  if (days < 0) {
    return { dagen_tot_vertrek: days, fase: dayDiff(today, end) >= 0 ? "onderweg" : "afgelopen" };
  }
  if (days <= 7) return { dagen_tot_vertrek: days, fase: "laatste week" };
  if (days <= 30) return { dagen_tot_vertrek: days, fase: "voorbereiden" };
  return { dagen_tot_vertrek: days, fase: "nog ver weg" };
}

type Row = Record<string, unknown>;

export interface RawTripContext {
  now: Date;
  userId: string;
  trip: Row;
  readiness: unknown;
  items: Row[];
  tasks: Row[];
  decisions: Row[];
  options: Row[];
  votes: Row[];
  members: Row[];
  profiles: Row[];
  travelerProfiles: Row[];
  expenses: Row[];
  documents: Row[];
}

const FALLBACK_NAME = "Medereiziger";

function omit(row: Row, keys: string[]): Row {
  const copy: Row = {};
  for (const [key, value] of Object.entries(row)) if (!keys.includes(key)) copy[key] = value;
  return copy;
}

const BLOCKED_KEY = /(^id$|_id$|^storage_path$|email)/i;

/** Defense in depth: drop id, storage-path and e-mail keys anywhere in the payload. */
export function stripIdentifiers<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => stripIdentifiers(entry)) as T;
  if (value && typeof value === "object") {
    const out: Row = {};
    for (const [key, entry] of Object.entries(value as Row)) {
      if (!BLOCKED_KEY.test(key)) out[key] = stripIdentifiers(entry);
    }
    return out as T;
  }
  return value;
}

export function buildTripContext(raw: RawTripContext) {
  return stripIdentifiers(assembleTripContext(raw));
}

function assembleTripContext(raw: RawTripContext) {
  const names = new Map<string, string>();
  for (const profile of raw.profiles) {
    if (typeof profile.id === "string") names.set(profile.id, (profile.display_name as string) || FALLBACK_NAME);
  }
  const nameOf = (id: unknown) => (typeof id === "string" && id ? names.get(id) || FALLBACK_NAME : null);

  const travelerProfiles = new Map(raw.travelerProfiles.map((p) => [p.user_id as string, p]));
  const memberIds = raw.members.map((m) => m.user_id as string);
  const self = raw.members.find((m) => m.user_id === raw.userId);

  const tz = raw.trip.timezone;
  const timing = tripTiming(raw.trip.start_date as string, raw.trip.end_date as string, raw.now, tz);

  const expenseTotals = new Map<string, number>();
  for (const expense of raw.expenses) {
    const currency = (expense.currency as string) || (raw.trip.currency as string) || "EUR";
    expenseTotals.set(currency, (expenseTotals.get(currency) || 0) + Number(expense.amount || 0));
  }

  return {
    nu: formatNow(raw.now, tz),
    dagen_tot_vertrek: timing.dagen_tot_vertrek,
    fase: timing.fase,
    jij: { naam: nameOf(raw.userId) || FALLBACK_NAME, rol: (self?.role as string) || "member" },
    trip: omit(raw.trip, ["id"]),
    readiness: raw.readiness,
    trip_items: raw.items.map((item) => omit(item, ["id"])),
    tasks: raw.tasks.map((task) => ({
      ...omit(task, ["id", "assigned_user_id"]),
      toegewezen_aan: nameOf(task.assigned_user_id),
    })),
    decisions: raw.decisions.map((decision) => {
      const votes = raw.votes.filter((vote) => vote.decision_id === decision.id);
      const voted = new Set(votes.map((vote) => vote.user_id as string));
      return {
        ...omit(decision, ["id"]),
        options: raw.options
          .filter((option) => option.decision_id === decision.id)
          .map((option) => ({
            label: option.label,
            description: option.description,
            stemmen: votes.filter((vote) => vote.option_id === option.id).map((vote) => nameOf(vote.user_id)),
          })),
        nog_niet_gestemd: memberIds.filter((id) => !voted.has(id)).map((id) => nameOf(id)),
      };
    }),
    members: raw.members.map((member) => {
      const profile = travelerProfiles.get(member.user_id as string);
      return {
        role: member.role,
        display_name: nameOf(member.user_id),
        wensen: profile
          ? {
            prioriteiten: profile.priorities,
            dieet: profile.diet,
            allergieen: profile.allergies,
            tempo: profile.pace,
            comfort: profile.comfort,
            budgetgevoel: profile.budget_feel,
            mobiliteit: profile.mobility,
            opmerkingen: profile.notes,
          }
          : null,
      };
    }),
    expenses: {
      recent: raw.expenses.map((expense) => ({
        ...omit(expense, ["paid_by_user_id"]),
        betaald_door: nameOf(expense.paid_by_user_id),
      })),
      totals_by_currency: Object.fromEntries(expenseTotals),
    },
    documents: raw.documents.map((document) => ({
      filename: document.filename,
      document_type: document.document_type,
      size_bytes: document.size_bytes,
      ready_at: document.ready_at,
      extracted: document.extracted_summary || document.extracted_text
        ? {
          summary: document.extracted_summary,
          text: typeof document.extracted_text === "string" ? document.extracted_text.slice(0, 4000) : null,
        }
        : null,
    })),
  };
}
