import { describe, expect, it } from "vitest";
import type { ExpenseBundle } from "./data";
import { settlementByCurrency } from "./settlement";

describe("currency separation in Kosten", () => {
  it("never offsets euros against dollars", () => {
    const expenses = [
      { currency: "EUR", amount: 40, paid_by_user_id: "a", splits: [{ user_id: "b", amount: 40 }] },
      { currency: "USD", amount: 40, paid_by_user_id: "b", splits: [{ user_id: "a", amount: 40 }] },
    ] as ExpenseBundle[];
    const groups = settlementByCurrency(expenses);
    expect(groups.map((group) => group.currency)).toEqual(["EUR", "USD"]);
    expect(groups[0].transfers).toEqual([{ fromUserId: "b", toUserId: "a", cents: 4000 }]);
    expect(groups[1].transfers).toEqual([{ fromUserId: "a", toUserId: "b", cents: 4000 }]);
  });
});