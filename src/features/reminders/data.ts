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
