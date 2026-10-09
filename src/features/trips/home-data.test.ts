import { describe, expect, it } from "vitest";
import { emptyHomeFacts, personalFollowUps, type HomeFacts } from "./home-data";
import type { TaskRow } from "@/integrations/supabase/database";
import type { DecisionBundle, ExpenseBundle } from "@/features/together/data";

const trips = [
  { id: "a", name: "Reis A", status: "planning", currency: "EUR" },
  { id: "b", name: "Reis B", status: "planning", currency: "EUR" },
  { id: "old", name: "Archief", status: "archived", currency: "EUR" },
];
const task = (id: string, trip_id: string, due_at: string | null, extra: Partial<TaskRow> = {}): TaskRow => ({ id, trip_id, title: id, assigned_user_id: "me", status: "todo", created_at: "2026-10-01", due_at, ...extra } as TaskRow);
const decision = (id: string, trip_id: string, voted = false): DecisionBundle => ({ id, trip_id, title: id, status: "open", created_at: "2026-10-01", options: [{ id: `${id}-option`, votes: voted ? [{ user_id: "me" }] : [] }] } as DecisionBundle);
const expense = (trip_id: string, payer: string, debtor: string, amount: number, currency = "EUR"): ExpenseBundle => ({ id: `expense-${trip_id}-${currency}`, trip_id, paid_by_user_id: payer, amount, currency, splits: [{ user_id: debtor, amount }] } as ExpenseBundle);
const facts = (extra: Partial<HomeFacts>): HomeFacts => ({ ...emptyHomeFacts, ...extra });

describe("Home personal follow-ups", () => {
  it("orders my tasks across trips by earliest due date and puts undated tasks last", () => {
    const result = personalFollowUps(trips, facts({ tasks: [task("late", "a", "2026-11-12"), task("undated", "a", null), task("early", "b", "2026-10-10")] }), "me");
    expect(result.map((row) => row.key)).toEqual(["task-early", "task-late", "task-undated"]);
    expect(result[0].tripName).toBe("Reis B");
    expect(result[0].href).toBe("/trip/b/samen?section=tasks");
  });
  it("selects only my open tasks in authorized active trips", () => {
    const result = personalFollowUps(trips, facts({ tasks: [task("mine", "a", null), task("other", "b", null, { assigned_user_id: "other" }), task("done", "b", null, { status: "done" }), task("old", "old", null), task("outside", "outside", null)] }), "me");
    expect(result.map((row) => row.key)).toEqual(["task-mine"]);
  });
  it("puts unvoted open choices after tasks and outgoing payments after choices", () => {
    const result = personalFollowUps(trips, facts({ tasks: [task("task", "b", null)], decisions: [decision("choice", "a"), decision("voted", "b", true), { ...decision("closed", "b"), status: "closed" }], expenses: [expense("b", "piet", "me", 43.5)], names: { piet: "Piet" } }), "me");
    expect(result.map((row) => row.kind)).toEqual(["task", "decision", "payment"]);
    expect(result[1].href).toBe("/trip/a/samen?section=decisions");
    expect(result[2].title.replace(/\u00a0/g, " ")).toBe("Je betaalt Piet € 43,50");
    expect(result[2].href).toBe("/trip/b/samen?section=expenses");
  });
  it("keeps payments separate per trip and currency and ignores incoming payments", () => {
    const result = personalFollowUps(trips, facts({ expenses: [expense("a", "piet", "me", 43.5), expense("b", "me", "piet", 43.5), expense("a", "piet", "me", 10, "USD"), expense("old", "piet", "me", 99)], names: { piet: "Piet" } }), "me");
    expect(result).toHaveLength(2);
    expect(result.every((row) => row.tripName === "Reis A")).toBe(true);
    expect(result.map((row) => row.key)).toEqual(["payment-a-EUR-piet", "payment-a-USD-piet"]);
  });
  it("shows no more than five points across all trips", () => {
    const result = personalFollowUps(trips, facts({ tasks: Array.from({ length: 7 }, (_, i) => task(`t${i}`, i % 2 ? "a" : "b", null)), decisions: [decision("choice", "a")] }), "me");
    expect(result).toHaveLength(5);
    expect(result.map((row) => row.key)).toEqual(["task-t0", "task-t1", "task-t2", "task-t3", "task-t4"]);
  });
  it("returns an empty selection when nothing waits on me", () => {
    expect(personalFollowUps(trips, emptyHomeFacts, "me")).toEqual([]);
    expect(personalFollowUps([], facts({ tasks: [task("outside", "a", null)] }), "me")).toEqual([]);
  });
});