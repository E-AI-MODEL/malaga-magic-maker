import { describe, expect, it } from "vitest";
import { splitEvenly, splitTotal } from "./money";

describe("expense split helpers", () => {
  it("keeps the exact total when cents do not divide evenly", () => {
    const splits = splitEvenly(100, ["a", "b", "c"]);
    expect(splits.map((split) => split.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(splitTotal(splits)).toBe(100);
  });

  it("handles a one-person expense without rounding drift", () => {
    const splits = splitEvenly(12.34, ["a"]);
    expect(splits).toEqual([{ user_id: "a", amount: 12.34 }]);
    expect(splitTotal(splits)).toBe(12.34);
  });

  it("returns no splits without participants", () => {
    expect(splitEvenly(10, [])).toEqual([]);
  });
});
