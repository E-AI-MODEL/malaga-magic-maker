import { splitEvenly } from "@/features/together/money";
import { computeBalances, settleBalances, type Transfer } from "@/features/together/settle";

/** Knaakie without an account lives only on this device until the visitor signs in. */
export const GUEST_KNAAKIE_KEY = "vakansie_guest_knaakie_v1";
export const GUEST_FREE_EXPENSES = 10;
export const GUEST_SELF_ID = "me";

export type GuestPerson = { id: string; name: string };
export type GuestExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitAmong: string[];
  createdAt: string;
};
export type GuestKnaakie = { name: string; people: GuestPerson[]; expenses: GuestExpense[]; used: number };

export const emptyGuestKnaakie = (): GuestKnaakie => ({ name: "", people: [{ id: GUEST_SELF_ID, name: "Jij" }], expenses: [], used: 0 });

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function parseGuestKnaakie(raw: string | null): GuestKnaakie {
  if (!raw) return emptyGuestKnaakie();
  try {
    const value = JSON.parse(raw) as Partial<GuestKnaakie>;
    const people = Array.isArray(value.people) ? value.people.filter((p) => p && typeof p.id === "string" && typeof p.name === "string") : [];
    if (!people.some((p) => p.id === GUEST_SELF_ID)) people.unshift({ id: GUEST_SELF_ID, name: "Jij" });
    const ids = new Set(people.map((p) => p.id));
    const expenses = Array.isArray(value.expenses) ? value.expenses.filter((e) =>
      e && typeof e.description === "string" && Number.isFinite(e.amount) && e.amount > 0 && /^[A-Z]{3}$/.test(e.currency) && ids.has(e.paidBy) && Array.isArray(e.splitAmong) && e.splitAmong.length > 0,
    ) : [];
    const used = Math.max(Number(value.used) || 0, expenses.length);
    return { name: typeof value.name === "string" ? value.name.slice(0, 80) : "", people, expenses, used };
  } catch {
    return emptyGuestKnaakie();
  }
}

export function loadGuestKnaakie(storage: Pick<Storage, "getItem"> = localStorage) {
  return parseGuestKnaakie(storage.getItem(GUEST_KNAAKIE_KEY));
}

export function saveGuestKnaakie(state: GuestKnaakie, storage: Pick<Storage, "setItem"> = localStorage) {
  storage.setItem(GUEST_KNAAKIE_KEY, JSON.stringify(state));
}

/** Deleting an expense never gives a free use back. */
export const guestUsesLeft = (state: GuestKnaakie) => Math.max(0, GUEST_FREE_EXPENSES - state.used);

export function addGuestExpense(state: GuestKnaakie, input: Omit<GuestExpense, "id" | "createdAt">): GuestKnaakie {
  if (guestUsesLeft(state) === 0) throw new Error("guest_limit_reached");
  if (!(input.amount > 0) || !input.description.trim() || input.splitAmong.length === 0) throw new Error("invalid_expense");
  const expense: GuestExpense = { ...input, description: input.description.trim().slice(0, 160), id: newId(), createdAt: new Date().toISOString() };
  return { ...state, expenses: [expense, ...state.expenses], used: state.used + 1 };
}

export function removeGuestExpense(state: GuestKnaakie, id: string): GuestKnaakie {
  return { ...state, expenses: state.expenses.filter((e) => e.id !== id) };
}

export function addGuestPerson(state: GuestKnaakie, name: string): GuestKnaakie {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!clean || state.people.some((p) => p.name.toLocaleLowerCase("nl-NL") === clean.toLocaleLowerCase("nl-NL"))) return state;
  return { ...state, people: [...state.people, { id: newId(), name: clean }] };
}

/** People who still appear in an expense cannot be removed. */
export function removeGuestPerson(state: GuestKnaakie, id: string): GuestKnaakie {
  if (id === GUEST_SELF_ID || state.expenses.some((e) => e.paidBy === id || e.splitAmong.includes(id))) return state;
  return { ...state, people: state.people.filter((p) => p.id !== id) };
}

export function guestTransfers(state: GuestKnaakie): Array<Transfer & { currency: string }> {
  const currencies = [...new Set(state.expenses.map((e) => e.currency))];
  return currencies.flatMap((currency) => {
    const rows = state.expenses.filter((e) => e.currency === currency).map((e) => ({
      paidByUserId: e.paidBy,
      amount: e.amount,
      splits: splitEvenly(e.amount, e.splitAmong),
    }));
    return settleBalances(computeBalances(rows)).map((t) => ({ ...t, currency }));
  });
}

/**
 * After sign-in only the account holder is a trip member, so every expense is
 * stored as paid by and split on that user; names stay readable in the description.
 */
export function guestImportRows(state: GuestKnaakie) {
  const names = new Map(state.people.map((p) => [p.id, p.name]));
  return [...state.expenses].reverse().map((e) => {
    const payer = e.paidBy === GUEST_SELF_ID ? "" : `betaald door ${names.get(e.paidBy) || "onbekend"}`;
    const others = e.splitAmong.filter((id) => id !== GUEST_SELF_ID).map((id) => names.get(id)).filter(Boolean);
    const shared = others.length ? `gedeeld met ${others.join(", ")}` : "";
    const note = [payer, shared].filter(Boolean).join(", ");
    return { description: (note ? `${e.description} (${note})` : e.description).slice(0, 200), amount: e.amount, currency: e.currency };
  });
}
