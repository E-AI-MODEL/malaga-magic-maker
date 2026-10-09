import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { deliveryReminders, inQuietHours, nextChannel, pushFailureAction, withinDailyLimit, type DeliveryInput } from "../../supabase/functions/_shared/reminders";
import { computeReminders } from "@/features/reminders/data";
import { pushSupport } from "@/features/push/support";

const trip = { id: "t1", name: "Zomer in Italië", status: "active", start_date: "2026-10-20", end_date: "2026-10-27", timezone: "Europe/Rome" };
const run = (now: string, extra: Partial<DeliveryInput> = {}) =>
  deliveryReminders({ now: new Date(now), trip, items: [], myTasks: [], decisions: [], ...extra });
const keys = (r: { key: string }[]) => r.map((x) => x.key.split(":")[0]);

describe("delivered reminders per phase", () => {
  it("departure in 7 days and tomorrow", () => {
    expect(keys(run("2026-10-13T08:00:00Z"))).toEqual(["departure-7"]);
    expect(keys(run("2026-10-19T08:00:00Z"))).toEqual(["departure-1"]);
    expect(run("2026-10-15T08:00:00Z")).toEqual([]);
  });
  it("check-in 24h before a confirmed flight only", () => {
    const items = [
      { id: "f", title: "KL1234", type: "flight", status: "confirmed", start_at: "2026-10-20T06:00:00Z" },
      { id: "g", title: "Optie", type: "flight", status: "planned", start_at: "2026-10-20T06:00:00Z" },
    ];
    const r = run("2026-10-19T08:00:00Z", { items });
    expect(r.find((x) => x.key.startsWith("checkin"))?.body).toBe("Inchecken voor KL1234 kan waarschijnlijk vanaf nu.");
    expect(r.filter((x) => x.key.startsWith("checkin"))).toHaveLength(1);
  });
  it("decision closing within 24h without my vote", () => {
    const d = { id: "d", title: "Restaurant", status: "open", closes_at: "2026-10-16T12:00:00Z" };
    expect(keys(run("2026-10-15T14:00:00Z", { decisions: [{ ...d, hasMyVote: false }] }))).toEqual(["decision-close"]);
    expect(run("2026-10-15T14:00:00Z", { decisions: [{ ...d, hasMyVote: true }] })).toEqual([]);
  });
  it("my task due today or tomorrow", () => {
    expect(keys(run("2026-10-15T08:00:00Z", { myTasks: [{ id: "k", title: "Huurauto", status: "open", due_at: "2026-10-16T10:00:00Z" }] }))).toEqual(["task-due"]);
  });
  it("on the road: today's first items", () => {
    const items = ["a", "b", "c", "d"].map((t, i) => ({ id: t, title: t, type: "activity", status: "planned", start_at: `2026-10-22T1${i}:00:00Z` }));
    expect(run("2026-10-22T06:30:00Z", { items }).find((x) => x.key.startsWith("today"))?.title).toBe("Vandaag: a, b, c");
  });
  it("nothing for archived trips, ideas or items outside the trip", () => {
    expect(deliveryReminders({ now: new Date("2026-10-13T08:00:00Z"), trip: { ...trip, status: "archived" }, items: [], myTasks: [], decisions: [] })).toEqual([]);
    expect(run("2026-11-02T08:00:00Z")).toEqual([]);
    const items = [
      { id: "i", title: "idee", type: "activity", status: "idea", start_at: "2026-10-22T10:00:00Z" },
      { id: "o", title: "KL9", type: "flight", status: "confirmed", start_at: "2026-10-29T06:00:00Z" },
    ];
    expect(run("2026-10-22T08:00:00Z", { items })).toEqual([]);
    expect(run("2026-10-28T08:00:00Z", { items })).toEqual([]);
  });
});

describe("delivery rules", () => {
  it("quiet hours 22:00-08:00 trip time", () => {
    expect(inQuietHours(new Date("2026-10-15T05:30:00Z"), "Europe/Rome")).toBe(true); // 07:30
    expect(inQuietHours(new Date("2026-10-15T06:00:00Z"), "Europe/Rome")).toBe(false); // 08:00
    expect(inQuietHours(new Date("2026-10-15T20:00:00Z"), "Europe/Rome")).toBe(true); // 22:00
  });
  it("max 3 per day across both channels", () => {
    expect(withinDailyLimit([1, 2, 3, 4], 0)).toEqual([1, 2, 3]);
    expect(withinDailyLimit([1, 2], 2)).toEqual([1]);
    expect(withinDailyLimit([1], 3)).toEqual([]);
  });
  it("push first, e-mail as fallback, never twice", () => {
    const base = { pushEnabled: true, hasSubscriptions: true, emailEnabled: true, alreadySent: [] as ("push" | "email")[] };
    expect(nextChannel(base)).toBe("push");
    expect(nextChannel({ ...base, pushSucceeded: true })).toBeNull();
    expect(nextChannel({ ...base, pushSucceeded: false })).toBe("email");
    expect(nextChannel({ ...base, pushEnabled: false })).toBe("email");
    expect(nextChannel({ ...base, pushEnabled: false, emailEnabled: false })).toBeNull();
    expect(nextChannel({ ...base, alreadySent: ["email"] })).toBeNull();
  });
  it("removes gone subscriptions on 404/410", () => {
    expect(pushFailureAction(410)).toBe("delete");
    expect(pushFailureAction(404)).toBe("delete");
    expect(pushFailureAction(500)).toBe("count");
  });
  it("database keeps one delivery per user, key and channel", () => {
    const sql = readFileSync("drizzle/migrations/0009_reminders_push_email.sql", "utf8");
    expect(sql).toContain("UNIQUE (user_id, reminder_key, channel)");
    expect(sql).toContain("DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;");
    expect(sql).toContain("DELETE FROM public.reminder_deliveries WHERE user_id = p_user_id;");
    expect(sql).toContain("DELETE FROM public.calendar_feeds WHERE user_id = p_user_id;");
    expect(sql).toContain("DELETE FROM public.trip_traveler_profiles WHERE user_id = p_user_id;");
    expect(sql).toContain("DELETE FROM public.payment_details WHERE user_id = p_user_id;");
    expect(sql).toContain("'reminders_enabled'");
  });
  it("send-reminders refuses calls without the cron secret", () => {
    const src = readFileSync("supabase/functions/send-reminders/index.ts", "utf8");
    expect(src).toContain('req.headers.get("x-cron-secret")');
    expect(src).toContain('return json(401, { error: "Unauthorized" })');
  });
  it("in-app reminders still come from the shared module", () => {
    expect(computeReminders({ now: 0, items: [], tasks: [], decisions: [] })).toEqual([]);
  });
});

describe("push support", () => {
  const env = { maxTouchPoints: 5, hasServiceWorker: true, hasPushManager: true, hasNotification: true };
  it("iPhone outside the home screen gets the e-mail explanation", () => {
    expect(pushSupport({ ...env, userAgent: "iPhone", standalone: false })).toBe("ios_needs_home_screen");
    expect(pushSupport({ ...env, userAgent: "iPhone", standalone: true })).toBe("supported");
    expect(pushSupport({ ...env, maxTouchPoints: 0, userAgent: "Windows", standalone: false })).toBe("supported");
  });
});
