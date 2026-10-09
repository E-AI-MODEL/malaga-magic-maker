export type ReminderInput = {
  now: number;
  tripStart?: string | null;
  items: Array<{ id: string; title: string; type: string; start_at: string | null; booking_reference?: string | null }>;
  tasks: Array<{ id: string; title: string; status: string; due_at: string | null }>;
  decisions: Array<{ id: string; title: string; status: string; closes_at: string | null; hasMyVote: boolean }>;
};

export type Reminder = {
  key: string;
  title: string;
  meta: string;
  tone: "urgent" | "soon";
  target: "reis" | "samen";
};

const DAY = 24 * 60 * 60 * 1000;

function dayCount(ms: number) {
  return Math.ceil(ms / DAY);
}

function relativeDays(diff: number) {
  if (diff < 0) return "verlopen";
  const days = dayCount(diff);
  if (diff < DAY) return "vandaag";
  if (days === 1) return "morgen";
  return `over ${days} dagen`;
}

/** Derives calm, time-based reminders from the trip's own facts. No background jobs. */
export function computeReminders(input: ReminderInput): Reminder[] {
  const reminders: Reminder[] = [];
  const { now } = input;

  if (input.tripStart) {
    const diff = new Date(`${input.tripStart}T00:00:00`).getTime() - now;
    if (diff >= 0 && diff <= 7 * DAY) {
      reminders.push({
        key: "departure",
        title: "Vertrek komt dichtbij",
        meta: `Je reis begint ${relativeDays(diff)} — check je documenten`,
        tone: diff <= 2 * DAY ? "urgent" : "soon",
        target: "reis",
      });
    }
  }

  for (const item of input.items) {
    if (!item.start_at) continue;
    const diff = new Date(item.start_at).getTime() - now;
    if (diff < 0 || diff > 2 * DAY) continue;
    const isTransport = ["flight", "train", "ferry", "bus", "transfer", "car_rental"].includes(item.type);
    reminders.push({
      key: `item-${item.id}`,
      title: isTransport ? `Inchecken voor ${item.title}` : item.title,
      meta: isTransport ? `Vertrekt ${relativeDays(diff)}` : `Staat gepland ${relativeDays(diff)}`,
      tone: diff <= DAY ? "urgent" : "soon",
      target: "reis",
    });
  }

  for (const task of input.tasks) {
    if (task.status === "done" || !task.due_at) continue;
    const diff = new Date(task.due_at).getTime() - now;
    if (diff > 7 * DAY) continue;
    reminders.push({
      key: `task-${task.id}`,
      title: task.title,
      meta: diff < 0 ? "Deadline verlopen" : `Deadline ${relativeDays(diff)}`,
      tone: diff <= DAY ? "urgent" : "soon",
      target: "samen",
    });
  }

  for (const decision of input.decisions) {
    if (decision.status !== "open" || decision.hasMyVote) continue;
    const diff = decision.closes_at ? new Date(decision.closes_at).getTime() - now : null;
    if (diff !== null && diff > 3 * DAY) continue;
    reminders.push({
      key: `decision-${decision.id}`,
      title: decision.title,
      meta: diff === null ? "Jouw stem ontbreekt nog" : diff < 0 ? "Stemmen gesloten" : `Stemmen kan nog ${relativeDays(diff)}`,
      tone: diff !== null && diff <= DAY ? "urgent" : "soon",
      target: "samen",
    });
  }

  return reminders.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "urgent" ? -1 : 1)).slice(0, 5);
}

// ---------------------------------------------------------------------------
// Delivered reminders (push / e-mail). Pure: runs in Deno and Vitest.

export type DeliveryTrip = { id: string; name: string; status: string; start_date: string | null; end_date: string | null; timezone: string | null };
export type DeliveryInput = {
  now: Date;
  trip: DeliveryTrip;
  items: Array<{ id: string; title: string; type: string; status: string; start_at: string | null }>;
  /** Tasks assigned to the recipient. */
  myTasks: Array<{ id: string; title: string; status: string; due_at: string | null }>;
  decisions: Array<{ id: string; title: string; status: string; closes_at: string | null; hasMyVote: boolean }>;
};
export type DeliveryReminder = { key: string; title: string; body: string; path: string };

const HOUR = 60 * 60 * 1000;

function zone(tz: string | null): string {
  if (tz) { try { new Intl.DateTimeFormat("en-CA", { timeZone: tz }); return tz; } catch { /* default */ } }
  return "Europe/Amsterdam";
}
export function localDay(date: Date, tz: string | null): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone(tz) }).format(date);
}
export function localHour(date: Date, tz: string | null): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: zone(tz), hour: "2-digit", hourCycle: "h23" }).format(date));
}
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

/** No messages between 22:00 and 08:00 trip-local time; they wait until 08:00. */
export function inQuietHours(now: Date, tz: string | null): boolean {
  const h = localHour(now, tz);
  return h < 8 || h >= 22;
}

function insideTrip(iso: string, trip: DeliveryTrip): boolean {
  if (!trip.start_date) return false;
  const day = localDay(new Date(iso), trip.timezone);
  return day >= trip.start_date.slice(0, 10) && day <= (trip.end_date || trip.start_date).slice(0, 10);
}

export function deliveryReminders(input: DeliveryInput): DeliveryReminder[] {
  const { now, trip } = input;
  if (trip.status === "archived" || !trip.start_date) return [];
  const today = localDay(now, trip.timezone);
  const start = trip.start_date.slice(0, 10);
  const end = (trip.end_date || trip.start_date).slice(0, 10);
  if (today > end) return [];
  const base = `/trip/${trip.id}`;
  const out: DeliveryReminder[] = [];
  const items = input.items.filter((i) => i.status !== "idea" && i.status !== "cancelled" && i.start_at && insideTrip(i.start_at, trip));

  const until = daysBetween(today, start);
  if (until === 7) out.push({ key: `departure-7:${trip.id}:${start}`, title: "Over een week vertrek je", body: `${trip.name} begint over 7 dagen.`, path: base });
  if (until === 1) out.push({ key: `departure-1:${trip.id}:${start}`, title: "Morgen vertrek je", body: `${trip.name} begint morgen.`, path: base });

  for (const f of items) {
    if (f.type !== "flight" || (f.status !== "confirmed" && f.status !== "paid")) continue;
    const diff = Date.parse(f.start_at!) - now.getTime();
    if (diff > 0 && diff <= 24 * HOUR) {
      out.push({ key: `checkin:${f.id}:${f.start_at}`, title: `Inchecken voor ${f.title}`, body: `Inchecken voor ${f.title} kan waarschijnlijk vanaf nu.`, path: `${base}/reis` });
    }
  }

  for (const d of input.decisions) {
    if (d.status !== "open" || d.hasMyVote || !d.closes_at) continue;
    const diff = Date.parse(d.closes_at) - now.getTime();
    if (diff > 0 && diff <= 24 * HOUR) {
      out.push({ key: `decision-close:${d.id}`, title: `Stem nog op ${d.title}`, body: `${trip.name}: deze keuze sluit binnen een dag.`, path: `${base}/samen` });
    }
  }

  for (const t of input.myTasks) {
    if (t.status === "done" || !t.due_at) continue;
    const due = localDay(new Date(t.due_at), trip.timezone);
    const d = daysBetween(today, due);
    if (d === 0 || d === 1) {
      out.push({ key: `task-due:${t.id}:${due}`, title: t.title, body: `${trip.name}: deze taak staat ${d === 0 ? "vandaag" : "morgen"} op jouw naam.`, path: `${base}/samen` });
    }
  }

  if (today >= start && today <= end && localHour(now, trip.timezone) >= 8) {
    const todays = items
      .filter((i) => localDay(new Date(i.start_at!), trip.timezone) === today)
      .sort((a, b) => a.start_at!.localeCompare(b.start_at!))
      .slice(0, 3);
    if (todays.length) {
      out.push({ key: `today:${trip.id}:${today}`, title: `Vandaag: ${todays.map((i) => i.title).join(", ")}`, body: trip.name, path: `${base}/reis` });
    }
  }
  return out;
}

export const DAILY_LIMIT = 3;

/** Keep at most DAILY_LIMIT messages per user per day, counting both channels together. */
export function withinDailyLimit<T>(reminders: T[], sentToday: number, limit = DAILY_LIMIT): T[] {
  return reminders.slice(0, Math.max(0, limit - sentToday));
}

export type Channel = "push" | "email";
/** Push first; e-mail only as fallback when push did not succeed. Already-sent channels never repeat. */
export function nextChannel(opts: {
  pushEnabled: boolean; hasSubscriptions: boolean; emailEnabled: boolean;
  alreadySent: Channel[]; pushSucceeded?: boolean;
}): Channel | null {
  if (opts.alreadySent.length > 0) return null;
  if (opts.pushEnabled && opts.hasSubscriptions && opts.pushSucceeded === undefined) return "push";
  if (opts.pushSucceeded) return null;
  return opts.emailEnabled ? "email" : null;
}

/** Push services answer 404/410 for subscriptions that no longer exist. */
export function pushFailureAction(status: number): "delete" | "count" {
  return status === 404 || status === 410 ? "delete" : "count";
}
