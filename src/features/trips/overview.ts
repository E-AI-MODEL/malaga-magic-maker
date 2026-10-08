const DAY = 86_400_000;

/** Date-only trip boundaries follow the trip's local calendar; the final day is still on-trip. */
export function tripHasEnded(trip: { status: string; end_date: string | null }, timeZone: string, now = new Date()): boolean {
  if (trip.status === "archived") return true;
  if (!trip.end_date) return false;
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return trip.end_date < `${part("year")}-${part("month")}-${part("day")}`;
}

export function upcomingTripItems<T extends { status: string; start_at: string | null }>(items: T[], now = Date.now()): T[] {
  return items
    .filter((item) => ["planned", "confirmed", "paid"].includes(item.status) && item.start_at && new Date(item.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime())
    .slice(0, 3);
}

function dateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/** Big countdown in the overview header: "nog 9 dagen", "vandaag vertrek je", "dag 3 van 7". */
export function countdownLabel(startDate: string | null, endDate: string | null, now = new Date()): string {
  const start = startDate ? dateKey(startDate) : null;
  if (start == null) return "datum nog kiezen";
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const end = (endDate && dateKey(endDate)) ?? start;
  const days = Math.round((start - today) / DAY);
  if (days > 1) return `nog ${days} dagen`;
  if (days === 1) return "morgen vertrek je";
  if (days === 0) return "vandaag vertrek je";
  if (today <= end) {
    const total = Math.round((end - start) / DAY) + 1;
    return `dag ${Math.round((today - start) / DAY) + 1} van ${total}`;
  }
  return "afgelopen";
}

export type FirstThing = {
  key: string;
  title: string;
  meta?: string;
  actionLabel: string;
  href: string;
};

/**
 * One ordered list for "Eerst dit": urgent reminders, then what waits on you,
 * then missing basics, then unconfirmed bookings, then a suggestion.
 */
export function firstThings(groups: {
  urgent: FirstThing[];
  mine: FirstThing[];
  basics: FirstThing[];
  bookings: FirstThing[];
  suggestions: FirstThing[];
}): FirstThing[] {
  const seen = new Set<string>();
  return [...groups.urgent, ...groups.mine, ...groups.basics, ...groups.bookings, ...groups.suggestions].filter(
    (thing) => (seen.has(thing.key) ? false : (seen.add(thing.key), true)),
  );
}

/** Keep personal follow-ups out of "Voor jou" when they already appear in "Eerst dit". */
export function excludeFirstThings<T extends { key: string }>(personal: T[], things: FirstThing[]): T[] {
  const firstThingKeys = new Set(things.map((thing) => thing.key));
  return personal.filter((item) => !firstThingKeys.has(item.key));
}

/** Preparation score: each check counts once; an empty plan or nights without a stay are never "geregeld". */
export function preparationScore(input: { checks: { attention_count: number }[]; itemCount: number; missingStay: boolean }) {
  const results = [
    ...input.checks.map((c) => c.attention_count === 0),
    input.itemCount > 0,
    !input.missingStay,
  ];
  return { done: results.filter(Boolean).length, total: results.length };
}
