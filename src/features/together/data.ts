import { supabase } from "@/integrations/supabase/client";
import type {
  DecisionOptionRow,
  DecisionRow,
  DecisionVoteRow,
  ExpenseRow,
  ExpenseSplitRow,
  TaskInsert,
  TaskRow,
  TaskUpdate,
} from "@/integrations/supabase/database";
import type { Json } from "@/integrations/supabase/types";

export type TripMemberView = {
  userId: string;
  role: string;
  joinedAt: string | null;
  displayName: string;
  username: string;
};

export type DecisionBundle = DecisionRow & {
  options: Array<DecisionOptionRow & { votes: DecisionVoteRow[] }>;
};

export type ExpenseBundle = ExpenseRow & {
  splits: ExpenseSplitRow[];
};

export async function listTripMembers(tripId: string): Promise<TripMemberView[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("trip_members")
    .select("user_id, role, joined_at")
    .eq("trip_id", tripId)
    .order("joined_at", { ascending: true });

  if (membershipError) throw membershipError;
  const ids = (memberships || []).map((membership) => membership.user_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", ids);
  if (profileError) throw profileError;

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return (memberships || []).map((membership) => {
    const profile = profileMap.get(membership.user_id);
    return {
      userId: membership.user_id,
      role: membership.role,
      joinedAt: membership.joined_at,
      displayName: profile?.display_name || "Medereiziger",
      username: profile?.username || "",
    };
  });
}

export async function listTasks(tripId: string): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("trip_id", tripId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTask(input: TaskInsert) {
  const { data, error } = await supabase.from("tasks").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateTask(tripId: string, taskId: string, input: TaskUpdate) {
  const { data, error } = await supabase
    .from("tasks")
    .update(input)
    .eq("trip_id", tripId)
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(tripId: string, taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("trip_id", tripId).eq("id", taskId);
  if (error) throw error;
}

export async function listDecisions(tripId: string): Promise<DecisionBundle[]> {
  const { data: decisions, error: decisionError } = await supabase
    .from("decisions")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (decisionError) throw decisionError;
  if (!decisions?.length) return [];

  const decisionIds = decisions.map((decision) => decision.id);
  const [{ data: options, error: optionError }, { data: votes, error: voteError }] = await Promise.all([
    supabase.from("decision_options").select("*").in("decision_id", decisionIds).order("sort_order", { ascending: true }),
    supabase.from("decision_votes").select("*").in("decision_id", decisionIds),
  ]);
  if (optionError) throw optionError;
  if (voteError) throw voteError;

  const votesByOption = new Map<string, DecisionVoteRow[]>();
  for (const vote of votes || []) {
    votesByOption.set(vote.option_id, [...(votesByOption.get(vote.option_id) || []), vote]);
  }

  const optionsByDecision = new Map<string, Array<DecisionOptionRow & { votes: DecisionVoteRow[] }>>();
  for (const option of options || []) {
    const enriched = { ...option, votes: votesByOption.get(option.id) || [] };
    optionsByDecision.set(option.decision_id, [...(optionsByDecision.get(option.decision_id) || []), enriched]);
  }

  return decisions.map((decision) => ({ ...decision, options: optionsByDecision.get(decision.id) || [] }));
}

export async function createDecisionWithOptions(input: {
  tripId: string;
  title: string;
  description: string | null;
  options: Array<{ label: string; description?: string | null }>;
}) {
  const { data, error } = await supabase.rpc("create_decision_with_options", {
    p_trip_id: input.tripId,
    p_title: input.title,
    p_description: input.description || "",
    p_options: input.options as Json,
  });
  if (error) throw error;
  return data;
}

export async function setDecisionVote(decisionId: string, optionId: string) {
  const { data, error } = await supabase.rpc("set_decision_vote", {
    p_decision_id: decisionId,
    p_option_id: optionId,
  });
  if (error) throw error;
  return data;
}

export async function setDecisionStatus(decisionId: string, status: "open" | "closed") {
  const { data, error } = await supabase
    .from("decisions")
    .update({ status })
    .eq("id", decisionId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDecision(decisionId: string) {
  const { error } = await supabase.from("decisions").delete().eq("id", decisionId);
  if (error) throw error;
}

export async function listExpenses(tripId: string): Promise<ExpenseBundle[]> {
  const { data: expenses, error: expenseError } = await supabase
    .from("expenses")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (expenseError) throw expenseError;
  if (!expenses?.length) return [];

  const ids = expenses.map((expense) => expense.id);
  const { data: splits, error: splitError } = await supabase
    .from("expense_splits")
    .select("*")
    .in("expense_id", ids);
  if (splitError) throw splitError;

  const byExpense = new Map<string, ExpenseSplitRow[]>();
  for (const split of splits || []) {
    byExpense.set(split.expense_id, [...(byExpense.get(split.expense_id) || []), split]);
  }
  return expenses.map((expense) => ({ ...expense, splits: byExpense.get(expense.id) || [] }));
}

export type ExpenseWrite = {
  description: string;
  amount: number;
  paidByUserId: string;
  currency: string;
  splits: Array<{ user_id: string; amount: number }>;
};

export async function createExpenseWithSplits(tripId: string, input: ExpenseWrite) {
  const { data, error } = await supabase.rpc("create_expense_with_splits", {
    p_trip_id: tripId,
    p_description: input.description,
    p_amount: input.amount,
    p_paid_by_user_id: input.paidByUserId,
    p_currency: input.currency,
    p_splits: input.splits as Json,
  });
  if (error) throw error;
  return data;
}

export async function updateExpenseWithSplits(expenseId: string, input: ExpenseWrite) {
  const { data, error } = await supabase.rpc("update_expense_with_splits", {
    p_expense_id: expenseId,
    p_description: input.description,
    p_amount: input.amount,
    p_paid_by_user_id: input.paidByUserId,
    p_currency: input.currency,
    p_splits: input.splits as Json,
  });
  if (error) throw error;
  return data;
}

export async function deleteExpense(tripId: string, expenseId: string) {
  const { error } = await supabase.from("expenses").delete().eq("trip_id", tripId).eq("id", expenseId);
  if (error) throw error;
}
