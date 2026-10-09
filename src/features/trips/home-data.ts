import { supabase } from "@/integrations/supabase/client";
import type { Trip } from "@/contexts/TripContext";
import type { TaskRow } from "@/integrations/supabase/database";
import type { DecisionBundle, ExpenseBundle } from "@/features/together/data";
import { computeBalances, settleBalances } from "@/features/together/settle";

export type HomeFacts = {
  tasks: TaskRow[];
  decisions: DecisionBundle[];
  expenses: ExpenseBundle[];
  names: Record<string, string>;
};

export type PersonalFollowUp = {
  key: string;
  kind: "task" | "decision" | "payment";
  title: string;
  tripName: string;
  href: string;
};

export const emptyHomeFacts: HomeFacts = { tasks: [], decisions: [], expenses: [], names: {} };

/** Read each kind once across authorized active trips; children are scoped by protected parents. */
export async function getHomeFacts(tripIds: string[]): Promise<HomeFacts> {
  if (!tripIds.length) return emptyHomeFacts;
  const [tasks, decisions, expenses, members] = await Promise.all([
    supabase.from("tasks").select("*").in("trip_id", tripIds).order("due_at", { ascending: true, nullsFirst: false }).order("created_at"),
    supabase.from("decisions").select("*").in("trip_id", tripIds).order("created_at", { ascending: false }),
    supabase.from("expenses").select("*").in("trip_id", tripIds).order("created_at", { ascending: false }),
    supabase.from("trip_members").select("user_id").in("trip_id", tripIds),
  ]);
  for (const result of [tasks, decisions, expenses, members]) if (result.error) throw result.error;
  const decisionIds = (decisions.data || []).map((row) => row.id);
  const expenseIds = (expenses.data || []).map((row) => row.id);
  const memberIds = [...new Set((members.data || []).map((row) => row.user_id))];
  const [options, votes, splits, profiles] = await Promise.all([
    decisionIds.length ? supabase.from("decision_options").select("*").in("decision_id", decisionIds).order("sort_order") : { data: [], error: null },
    decisionIds.length ? supabase.from("decision_votes").select("*").in("decision_id", decisionIds) : { data: [], error: null },
    expenseIds.length ? supabase.from("expense_splits").select("*").in("expense_id", expenseIds) : { data: [], error: null },
    memberIds.length ? supabase.from("profiles").select("id, display_name").in("id", memberIds) : { data: [], error: null },
  ]);
  for (const result of [options, votes, splits, profiles]) if (result.error) throw result.error;
  return {
    tasks: tasks.data || [],
    decisions: (decisions.data || []).map((row) => ({ ...row, options: (options.data || []).filter((option) => option.decision_id === row.id).map((option) => ({ ...option, votes: (votes.data || []).filter((vote) => vote.option_id === option.id) })) })),
    expenses: (expenses.data || []).map((row) => ({ ...row, splits: (splits.data || []).filter((split) => split.expense_id === row.id) })),
    names: Object.fromEntries((profiles.data || []).map((row) => [row.id, row.display_name])),
  };
}

/** Tasks first (earliest deadline, undated last), then unvoted choices, then outgoing settlements. */
export function personalFollowUps(trips: Pick<Trip, "id" | "name" | "status" | "currency">[], facts: HomeFacts, userId: string): PersonalFollowUp[] {
  const active = new Map(trips.filter((trip) => trip.status !== "archived").map((trip) => [trip.id, trip]));
  const taskItems: PersonalFollowUp[] = [...facts.tasks]
    .filter((task) => task.trip_id && active.has(task.trip_id) && task.status !== "done" && task.assigned_user_id === userId)
    .sort((a, b) => (a.due_at || "9999").localeCompare(b.due_at || "9999") || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .map((task) => ({ key: `task-${task.id}`, kind: "task", title: task.title, tripName: active.get(task.trip_id || "")?.name || "", href: `/trip/${task.trip_id}/samen?section=tasks` }));
  const decisionItems: PersonalFollowUp[] = [...facts.decisions]
    .filter((decision) => active.has(decision.trip_id) && decision.status === "open" && !decision.options.some((option) => option.votes.some((vote) => vote.user_id === userId)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id))
    .map((decision) => ({ key: `decision-${decision.id}`, kind: "decision", title: decision.title, tripName: active.get(decision.trip_id)?.name || "", href: `/trip/${decision.trip_id}/samen?section=decisions` }));
  const payments: PersonalFollowUp[] = [];
  for (const trip of active.values()) {
    // Keep balances within one trip and currency; never offset unrelated trips.
    const currencies = [...new Set(facts.expenses.filter((expense) => expense.trip_id === trip.id).map((expense) => expense.currency))].sort();
    for (const currency of currencies) {
      const balances = computeBalances(facts.expenses.filter((expense) => expense.trip_id === trip.id && expense.currency === currency).map((expense) => ({ paidByUserId: expense.paid_by_user_id, amount: Number(expense.amount), splits: expense.splits.map((split) => ({ user_id: split.user_id, amount: Number(split.amount) })) })));
      for (const transfer of settleBalances(balances).filter((transfer) => transfer.fromUserId === userId)) {
        const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(transfer.cents / 100);
        payments.push({ key: `payment-${trip.id}-${currency}-${transfer.toUserId}`, kind: "payment", title: `Je betaalt ${facts.names[transfer.toUserId] || "een reisgenoot"} ${money}`, tripName: trip.name, href: `/trip/${trip.id}/samen?section=expenses` });
      }
    }
  }
  return [...taskItems, ...decisionItems, ...payments].slice(0, 5);
}