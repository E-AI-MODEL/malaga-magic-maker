import { describe, expect, it } from "vitest";
import { computeReminders } from "./data";

const now = new Date("2026-08-20T10:00:00Z").getTime();
const base = { now, items: [], tasks: [], decisions: [] };

describe("computeReminders", () => {
  it("stays quiet when nothing is near", () => {
    expect(computeReminders({ ...base, tripStart: "2026-12-01" })).toEqual([]);
  });

  it("flags a flight within 24 hours as urgent", () => {
    const result = computeReminders({
      ...base,
      items: [{ id: "1", title: "Vlucht naar Malaga", type: "flight", start_at: "2026-08-20T20:00:00Z" }],
    });
    expect(result[0].tone).toBe("urgent");
    expect(result[0].title).toContain("Inchecken");
  });

  it("flags an overdue task", () => {
    const result = computeReminders({
      ...base,
      tasks: [{ id: "t", title: "Huurauto regelen", status: "open", due_at: "2026-08-18T10:00:00Z" }],
    });
    expect(result[0].meta).toBe("Deadline verlopen");
  });
});
