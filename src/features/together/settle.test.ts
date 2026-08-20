import { describe, expect, it } from "vitest";
import { computeBalances, settleBalances } from "./settle";

describe("settle", () => {
  it("balances a simple shared expense", () => {
    const balances = computeBalances([
      { paidByUserId: "a", amount: 30, splits: [{ user_id: "a", amount: 10 }, { user_id: "b", amount: 10 }, { user_id: "c", amount: 10 }] },
    ]);
    expect(balances).toEqual([
      { userId: "a", cents: 2000 },
      { userId: "b", cents: -1000 },
      { userId: "c", cents: -1000 },
    ]);
    const transfers = settleBalances(balances);
    expect(transfers).toHaveLength(2);
    expect(transfers.every((t) => t.toUserId === "a")).toBe(true);
  });

  it("clears out to zero", () => {
    const balances = computeBalances([
      { paidByUserId: "a", amount: 100, splits: [{ user_id: "a", amount: 50 }, { user_id: "b", amount: 50 }] },
      { paidByUserId: "b", amount: 40, splits: [{ user_id: "a", amount: 20 }, { user_id: "b", amount: 20 }] },
    ]);
    const transfers = settleBalances(balances);
    expect(transfers).toEqual([{ fromUserId: "b", toUserId: "a", cents: 3000 }]);
  });
});
