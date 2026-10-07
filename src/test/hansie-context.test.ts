import { describe, expect, it } from "vitest";
import { buildTripContext, formatNow, tripTiming } from "../../supabase/functions/trip-ai-chat/context";

const ME = "11111111-1111-4111-8111-111111111111";
const ANNA = "22222222-2222-4222-8222-222222222222";
const BOB = "33333333-3333-4333-8333-333333333333";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function sample() {
  return buildTripContext({
    now: new Date("2026-10-07T12:05:00Z"),
    userId: ME,
    trip: { id: "44444444-4444-4444-8444-444444444444", name: "Lissabon", start_date: "2026-10-16", end_date: "2026-10-20", timezone: "Europe/Amsterdam", currency: "EUR" },
    readiness: { attention_count: 1 },
    items: [{ id: "55555555-5555-4555-8555-555555555555", title: "Vlucht", status: "booked" }],
    tasks: [{ id: "66666666-6666-4666-8666-666666666666", title: "Paspoort", assigned_user_id: ANNA }],
    decisions: [{ id: "d1", title: "Restaurant" }],
    options: [{ id: "o1", decision_id: "d1", label: "Vis" }, { id: "o2", decision_id: "d1", label: "Vlees" }],
    votes: [{ decision_id: "d1", option_id: "o1", user_id: ANNA }],
    members: [{ user_id: ME, role: "organizer" }, { user_id: ANNA, role: "member" }, { user_id: BOB, role: "member" }],
    profiles: [{ id: ME, display_name: "Hans" }, { id: ANNA, display_name: "Anna" }, { id: BOB, display_name: "Bob" }],
    travelerProfiles: [{ user_id: ANNA, diet: "vegetarisch" }],
    expenses: [{ description: "Huur", amount: 300, currency: "EUR", paid_by_user_id: BOB }],
    documents: [{ filename: "ticket.pdf", trip_item_id: "77777777-7777-4777-8777-777777777777", storage_path: "x/y.pdf" }],
  });
}

describe("Hansie trip context", () => {
  it("contains no user ids, other ids or storage paths", () => {
    const json = JSON.stringify(sample());
    expect(json).not.toMatch(UUID);
    expect(json).not.toContain("storage_path");
    expect(json).not.toMatch(/"[a-z_]*id":/);
  });

  it("replaces user ids by names", () => {
    const ctx = sample();
    expect(ctx.jij).toEqual({ naam: "Hans", rol: "organizer" });
    expect(ctx.tasks[0].toegewezen_aan).toBe("Anna");
    expect(ctx.expenses.recent[0].betaald_door).toBe("Bob");
  });

  it("lists votes per option and who has not voted yet", () => {
    const decision = sample().decisions[0];
    expect(decision.options[0].stemmen).toEqual(["Anna"]);
    expect(decision.options[1].stemmen).toEqual([]);
    expect(decision.nog_niet_gestemd).toEqual(["Hans", "Bob"]);
  });

  it("formats now in the trip time zone", () => {
    expect(formatNow(new Date("2026-10-07T12:05:00Z"), "Europe/Amsterdam")).toBe("woensdag 7 oktober 2026, 14:05");
    expect(formatNow(new Date("2026-10-07T12:05:00Z"), "Not/AZone")).toBe("woensdag 7 oktober 2026, 14:05");
  });

  it("derives the phase from the days until departure", () => {
    const now = new Date("2026-10-07T12:00:00Z");
    const tz = "Europe/Amsterdam";
    expect(tripTiming("2026-11-07", null, now, tz)).toEqual({ dagen_tot_vertrek: 31, fase: "nog ver weg" });
    expect(tripTiming("2026-11-06", null, now, tz).fase).toBe("voorbereiden");
    expect(tripTiming("2026-10-15", null, now, tz).fase).toBe("voorbereiden");
    expect(tripTiming("2026-10-14", null, now, tz).fase).toBe("laatste week");
    expect(tripTiming("2026-10-07", null, now, tz)).toEqual({ dagen_tot_vertrek: 0, fase: "laatste week" });
    expect(tripTiming("2026-10-01", "2026-10-09", now, tz).fase).toBe("onderweg");
    expect(tripTiming("2026-09-01", "2026-09-10", now, tz).fase).toBe("afgelopen");
  });
});
