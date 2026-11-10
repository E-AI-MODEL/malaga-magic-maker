import { ACCOMMODATION_DECISION_TITLE } from "@/features/travel/accommodation";

/** Customer copy for a decision title. The stored title stays unchanged for the backend. */
export function displayDecisionTitle(title: string): string {
  return title.trim() === ACCOMMODATION_DECISION_TITLE ? "Kies jullie verblijf" : title;
}

/** One action line per decision state. */
export function decisionStatusLine(status: string, hasOwnVote: boolean): string {
  if (status !== "open") return "Gesloten";
  return hasOwnVote ? "Gestemd" : "Stem nu";
}

export function tasksTileLine(openMine: number): string {
  return openMine === 0 ? "Niets voor jou" : `${openMine} voor jou`;
}

export function decisionsTileLine(waitingForMe: number): string {
  return waitingForMe === 0 ? "Niets te kiezen" : `${waitingForMe} wacht op je stem`;
}

const COUNT_WORDS = ["nul", "een", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

type NameOf = (userId: string | null | undefined) => string | null;

/** Lively status for the Taken tile; names the concrete task when there is just one. */
export function tasksLiveLine(input: {
  tasks: Array<{ title: string; status: string; progress: number; assigned_user_id: string | null }>;
  userId: string;
  nameOf: NameOf;
}): string {
  const { tasks, userId, nameOf } = input;
  if (tasks.length === 0) return "Wie regelt wat?";
  const open = tasks.filter((task) => task.status !== "done" && task.progress < 100);
  if (open.length === 0) return "Alles geregeld. Lekker!";
  const mine = open.filter((task) => task.assigned_user_id === userId);
  if (mine.length === 1) return `Jij regelt ${lowerFirst(mine[0].title)}.`;
  if (mine.length > 1) return `Er staan nog ${countWord(mine.length)} dingen voor je open.`;
  if (open.length === 1) {
    const task = open[0];
    const name = task.assigned_user_id ? nameOf(task.assigned_user_id) : null;
    return name ? `${name} regelt ${lowerFirst(task.title)}.` : `Wie pakt ${lowerFirst(task.title)} op?`;
  }
  return `Nog ${countWord(open.length)} dingen op het lijstje.`;
}

/** Lively status for the Keuzes tile. */
export function decisionsLiveLine(input: {
  decisions: Array<{ title: string; status: string; options: Array<{ label: string; votes: Array<{ user_id: string; created_at?: string }> }> }>;
  userId: string;
  memberCount: number;
  nameOf: NameOf;
}): string {
  const { decisions, userId, memberCount, nameOf } = input;
  if (decisions.length === 0) return "Waar gaan we heen, wat gaan we doen?";
  const open = decisions.filter((decision) => decision.status === "open");
  if (open.length === 0) {
    const closed = decisions[0];
    const winner = [...closed.options].sort((a, b) => b.votes.length - a.votes.length)[0];
    return winner && winner.votes.length > 0 ? `Het wordt ${winner.label}!` : "De plannen liggen vast.";
  }
  const voters = (decision: (typeof open)[number]) => new Set(decision.options.flatMap((option) => option.votes.map((vote) => vote.user_id)));
  if (open.some((decision) => !voters(decision).has(userId))) {
    const other = open.flatMap((decision) => decision.options.flatMap((option) => option.votes))
      .filter((vote) => vote.user_id !== userId)
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
    const name = other ? nameOf(other.user_id) : null;
    return name ? `${name} heeft een favoriet gekozen. Jij mag nog stemmen!` : "Jij mag nog stemmen!";
  }
  const missing = Math.max(0, memberCount - voters(open[0]).size);
  if (missing === 1) return "Nog één stem en het staat vast.";
  if (missing > 1) return `Nog ${countWord(missing)} stemmen en het staat vast.`;
  return "Iedereen heeft gestemd.";
}

/** Lively status for the Knaakie tile, from the caller's own settlement position. */
export function knaakieLiveLine(input: {
  expenses: Array<{ amount: number; currency: string; paid_by_user_id: string | null; created_at: string }>;
  transfers: Array<{ currency: string; fromUserId: string; toUserId: string; cents: number }>;
  userId: string;
  nameOf: NameOf;
  format: (amount: number, currency: string) => string;
}): string {
  const { expenses, transfers, userId, nameOf, format } = input;
  if (expenses.length === 0) return "Wie betaalt wat? Scan je eerste bon.";
  const owe = transfers.find((t) => t.fromUserId === userId);
  if (owe) {
    const name = nameOf(owe.toUserId);
    const amount = format(owe.cents / 100, owe.currency);
    return name ? `Je moet ${name} nog ${amount} betalen.` : `Je moet nog ${amount} betalen.`;
  }
  const incoming = transfers.filter((t) => t.toUserId === userId);
  if (incoming.length > 0) {
    const currency = incoming[0].currency;
    const cents = incoming.filter((t) => t.currency === currency).reduce((sum, t) => sum + t.cents, 0);
    return `Je krijgt nog ${format(cents / 100, currency)} terug.`;
  }
  if (transfers.length > 0) {
    const latest = [...expenses].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const name = latest.paid_by_user_id === userId ? "Jij" : nameOf(latest.paid_by_user_id);
    return name ? `${name} schoot ${format(Number(latest.amount), latest.currency)} voor.` : "Er staat een nieuw bonnetje in Knaakie.";
  }
  return "Iedereen heeft betaald. We staan quitte!";
}

/** One headline for the Samen overview. */
export function samenHeadline(input: { tasksDone: boolean; decisionsDone: boolean; waitingForMe: boolean; hasAnything: boolean }): string {
  if (!input.hasAnything) return "Maak samen plannen.";
  if (input.waitingForMe) return "Heb jij al gestemd?";
  if (input.tasksDone && input.decisionsDone) return "Alles staat klaar voor vertrek.";
  if (input.decisionsDone) return "Nog even de laatste dingen regelen.";
  return "De vakantie krijgt vorm!";
}
