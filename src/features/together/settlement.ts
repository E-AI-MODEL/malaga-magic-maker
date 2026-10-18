import type { ExpenseBundle } from "./data";
import { computeBalances, settleBalances } from "./settle";

/** Currency groups are never converted or offset against one another. */
export function settlementByCurrency(expenses: ExpenseBundle[]) {
  return [...new Set(expenses.map((expense) => expense.currency))].sort().map((currency) => {
    const rows = expenses.filter((expense) => expense.currency === currency);
    const balances = computeBalances(rows.map((expense) => ({
      paidByUserId: expense.paid_by_user_id,
      amount: Number(expense.amount),
      splits: expense.splits.map((split) => ({ user_id: split.user_id, amount: Number(split.amount) })),
    })));
    return { currency, balances, transfers: settleBalances(balances) };
  });
}

export function formatExpenseMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);
}