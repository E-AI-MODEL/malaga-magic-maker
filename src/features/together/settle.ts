export type SettleExpense = {
  paidByUserId: string | null;
  amount: number;
  splits: Array<{ user_id: string | null; amount: number }>;
};

export type Balance = { userId: string; cents: number };
export type Transfer = { fromUserId: string; toUserId: string; cents: number };

/** Net position per person in cents: positive = paid more than their share. */
export function computeBalances(expenses: SettleExpense[]): Balance[] {
  const totals = new Map<string, number>();
  const add = (userId: string, cents: number) => totals.set(userId, (totals.get(userId) || 0) + cents);

  for (const expense of expenses) {
    if (expense.paidByUserId) add(expense.paidByUserId, Math.round(expense.amount * 100));
    for (const split of expense.splits) {
      if (split.user_id) add(split.user_id, -Math.round(split.amount * 100));
    }
  }

  return [...totals.entries()]
    .map(([userId, cents]) => ({ userId, cents }))
    .sort((a, b) => b.cents - a.cents);
}

/** Greedy minimal set of payments that clears every balance. */
export function settleBalances(balances: Balance[]): Transfer[] {
  const creditors = balances.filter((b) => b.cents > 0).map((b) => ({ ...b })).sort((a, b) => b.cents - a.cents);
  const debtors = balances.filter((b) => b.cents < 0).map((b) => ({ ...b })).sort((a, b) => a.cents - b.cents);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.cents, -debt.cents);
    if (amount > 0) {
      transfers.push({ fromUserId: debt.userId, toUserId: credit.userId, cents: amount });
      credit.cents -= amount;
      debt.cents += amount;
    }
    if (credit.cents === 0) ci += 1;
    if (debt.cents === 0) di += 1;
  }

  return transfers;
}
