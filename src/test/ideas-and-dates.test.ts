import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { candidateStayStatus, chosenIdeaUpdate, decisionWinner } from "@/features/travel/accommodation";
import { dateShiftAnchor, itemsOutsideTrip, shiftItemDates, timelineWarnings } from "@/features/travel/presentation";
import { preparationScore, upcomingTripItems } from "@/features/trips/overview";
import { tripPreparation } from "@/features/trips/preparation";
import type { Trip } from "@/contexts/TripContext";
import type { TripItemRow } from "@/integrations/supabase/database";

const item = (id: string, status: string, start: string, end: string | null = null, type = "stay") =>
  ({ id, type, title: id, status, start_at: start, end_at: end, booking_reference: null });

describe("search candidates", () => {
  it("are ideas unless chosen", () => {
    expect(candidateStayStatus(false)).toBe("idea");
    expect(candidateStayStatus(true)).toBe("planned");
  });
  it("the vote winner is the option with the most votes, url from the description", () => {
    const w = decisionWinner([
      { label: "A", description: "x — https://a.example/1", votes: [1] },
      { label: "B", description: "y — https://b.example/2", votes: [1, 2] },
    ]);
    expect(w?.option.label).toBe("B");
    expect(w?.url).toBe("https://b.example/2");
    expect(decisionWinner([{ label: "A", description: null, votes: [] }])).toBeNull();
  });
  it("choosing an idea makes it planned on the current trip dates", () => {
    const u = chosenIdeaUpdate({ type: "stay" }, { start_date: "2026-10-15", end_date: "2026-10-24" }, "UTC");
    expect(u).toEqual({ status: "planned", start_at: "2026-10-15T15:00:00.000Z", end_at: "2026-10-24T11:00:00.000Z" });
  });
});

describe("ideas never count as bookings", () => {
  it("no overlap or night coverage from ideas", () => {
    const w = timelineWarnings([
      item("a", "idea", "2027-06-10T15:00:00Z", "2027-06-12T11:00:00Z"),
      item("b", "idea", "2027-06-10T15:00:00Z", "2027-06-12T11:00:00Z"),
    ], "2026-10-15", "2026-10-17");
    expect(w.some((x) => x.kind === "overlap")).toBe(false);
    expect(w.some((x) => x.kind === "outside_trip")).toBe(false);
    expect(w.find((x) => x.kind === "missing_stay")?.message).toBe("2 nachten nog zonder overnachting.");
  });
  it("readiness counts only planned bookings and non-idea items", () => {
    const sql = readFileSync("drizzle/migrations/0008_readiness_ignores_ideas.sql", "utf8");
    expect(sql).toContain("i.status = 'planned'");
    expect(sql).toContain("i.status NOT IN ('idea','cancelled')");
  });
  it("preparation score item count excludes ideas", () => {
    const activeTrip = { id: "trip", start_date: null, end_date: null } as Trip;
    const result = tripPreparation({ activeTrip, items: [item("idea", "idea", "2026-10-15"), item("cancelled", "cancelled", "2026-10-15")] as TripItemRow[], tasks: [], decisions: [], ended: false });
    expect(result.done).toBe(1);
    const planned = tripPreparation({ activeTrip, items: [item("planned", "planned", "2026-10-15")] as TripItemRow[], tasks: [], decisions: [], ended: false });
    expect(planned.done).toBe(2);
    expect(preparationScore({ checks: [], itemCount: 0, missingStay: false }).done).toBe(1);
  });
});

describe("trip dates", () => {
  it("flags items outside the trip", () => {
    const w = timelineWarnings([item("a", "planned", "2027-06-10T15:00:00Z", "2027-06-12T11:00:00Z")], "2026-10-15", "2026-10-24");
    const out = w.find((x) => x.kind === "outside_trip");
    expect(out?.message).toBe("1 onderdeel valt buiten je reisdata.");
    expect(out?.itemIds).toEqual(["a"]);
  });
  it("shifts items by the same number of days as the trip start", () => {
    expect(shiftItemDates({ start_at: "2027-06-10T15:00:00.000Z", end_at: "2027-06-12T11:00:00.000Z" }, "2027-06-10", "2026-10-15"))
      .toEqual({ start_at: "2026-10-15T15:00:00.000Z", end_at: "2026-10-17T11:00:00.000Z" });
    expect(itemsOutsideTrip([item("i", "idea", "2027-01-01T00:00:00Z")], "2026-10-15", "2026-10-24")).toHaveLength(0);
  });
  it("Eerstvolgend shows only items within the trip dates", () => {
    const now = Date.parse("2026-10-01T00:00:00Z");
    const up = upcomingTripItems([item("in", "planned", "2026-10-16T10:00:00Z"), item("out", "planned", "2027-06-10T10:00:00Z")], now, { start_date: "2026-10-15", end_date: "2026-10-24" });
    expect(up.map((x) => x.id)).toEqual(["in"]);
  });
});

describe("trip end date", () => {
  it("outside_trip counts an item ending after the trip end", () => {
    const w = timelineWarnings([item("late", "planned", "2026-10-22T15:00:00Z", "2026-10-26T11:00:00Z")], "2026-10-15", "2026-10-24");
    expect(w.find((x) => x.kind === "outside_trip")?.itemIds).toEqual(["late"]);
  });
  it("shifts by the end move when only the end date changed", () => {
    expect(dateShiftAnchor("2026-10-15", "2026-10-15", "2026-10-24", "2026-10-21")).toEqual(["2026-10-24", "2026-10-21"]);
    expect(dateShiftAnchor("2026-10-15", "2026-10-16", "2026-10-24", "2026-10-25")).toEqual(["2026-10-15", "2026-10-16"]);
  });
});
