import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { healthFields } from "@/features/travelers/data";
import { buildTripContext } from "../../supabase/functions/trip-ai-chat/context";

const sql = readFileSync("drizzle/migrations/0012_self_delete_account_and_health_consent.sql", "utf8");

describe("delete_my_account", () => {
  it("only ever deletes the caller", () => {
    expect(sql).toContain("v_user uuid := auth.uid()");
    expect(sql).not.toMatch(/delete_my_account\(p_user_id/);
    expect(sql).toContain("DELETE FROM auth.users WHERE id = v_user;");
  });
  it("cleans up the same personal data as ops_delete_user", () => {
    for (const table of [
      "push_subscriptions", "reminder_deliveries", "calendar_feeds", "trip_traveler_profiles", "trip_members",
      "notifications", "notification_preferences", "decision_votes", "expense_splits", "entitlements",
      "ai_usage_events", "activity_log", "client_error_events", "trip_invite_uses", "user_roles", "payment_details",
    ]) expect(sql).toContain(`DELETE FROM public.${table} WHERE user_id = v_user;`);
    expect(sql).toContain("DELETE FROM public.profiles WHERE id = v_user;");
  });
  it("deletes solo trips and returns their document paths for storage removal", () => {
    expect(sql).toContain("DELETE FROM public.trip WHERE id = v_trip.trip_id;");
    expect(sql).toContain("array_agg(d.storage_path)");
    expect(readFileSync("supabase/functions/delete-account/index.ts", "utf8")).toContain('storage.from("trip-documents").remove');
  });
  it("hands the organizer role to the longest-present member", () => {
    expect(sql).toContain("ORDER BY o.joined_at ASC NULLS LAST");
    expect(sql).toContain("UPDATE public.trip_members SET role = 'organizer'");
  });
  it("blocks platform admins and logs without e-mail", () => {
    expect(sql).toContain("platform_admin_cannot_self_delete");
    const log = sql.slice(sql.indexOf("'user.self_deleted'"));
    expect(log.slice(0, 200)).not.toContain("email");
  });
});

describe("health data consent", () => {
  const base = { diet: ["Glutenvrij"], allergies: "noten" };
  it("clears diet and allergies without consent", () => {
    expect(healthFields({ ...base, healthConsent: false })).toEqual({ diet: [], allergies: null, health_consent_at: null });
  });
  it("keeps them with consent and records the time", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    expect(healthFields({ ...base, healthConsent: true }, now)).toEqual({ diet: ["Glutenvrij"], allergies: "noten", health_consent_at: now.toISOString() });
    expect(healthFields({ ...base, healthConsent: true, healthConsentAt: "2026-01-01T00:00:00.000Z" }, now).health_consent_at).toBe("2026-01-01T00:00:00.000Z");
  });
  it("the database also clears them when consent is missing", () => {
    expect(sql).toContain("IF NEW.health_consent_at IS NULL THEN");
  });
  it("Hansie only gets diet and allergies with consent", () => {
    const me = "11111111-1111-4111-8111-111111111111";
    const build = (consent: string | null) => JSON.stringify(buildTripContext({
      now: new Date("2026-10-09T12:00:00Z"), userId: me,
      trip: { id: "44444444-4444-4444-8444-444444444444", name: "Reis", start_date: "2026-10-16", end_date: "2026-10-20", timezone: "Europe/Amsterdam", currency: "EUR" },
      readiness: {}, items: [], tasks: [], decisions: [], options: [], votes: [], expenses: [], splits: [], documents: [],
      members: [{ user_id: me, role: "organizer" }], profiles: [{ id: me, display_name: "Ik" }],
      travelerProfiles: [{ user_id: me, priorities: [], diet: ["Glutenvrij"], allergies: "noten", health_consent_at: consent }],
    } as never));
    expect(build(null)).not.toContain("noten");
    expect(build("2026-10-09T10:00:00Z")).toContain("noten");
  });
});
