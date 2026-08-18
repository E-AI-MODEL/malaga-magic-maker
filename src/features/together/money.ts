export type MoneySplit = { user_id: string; amount: number };

export function splitEvenly(total: number, userIds: string[]): MoneySplit[] {
  if (!Number.isFinite(total) || total < 0 || userIds.length === 0) return [];

  const cents = Math.round(total * 100);
  const base = Math.floor(cents / userIds.length);
  let remainder = cents - base * userIds.length;

  return userIds.map((userId) => {
    const share = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { user_id: userId, amount: share / 100 };
  });
}

export function splitTotal(splits: MoneySplit[]) {
  return splits.reduce((sum, split) => sum + Math.round(split.amount * 100), 0) / 100;
}
