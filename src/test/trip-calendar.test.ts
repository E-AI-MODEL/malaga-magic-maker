import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildTripCalendar, escapeText, foldLine } from "../../supabase/functions/trip-calendar/calendar";

const src = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const trip = { id: "t1", name: "Zomer, Italië", start_date: "2026-07-01", end_date: "2026-07-05", timezone: "Europe/Rome" };
const base = { location_name: null, address: null, provider: null, metadata: {} };

describe("buildTripCalendar", () => {
  const ics = buildTripCalendar(trip, [
    { ...base, id: "a", title: "Vlucht", status: "confirmed", start_at: "2026-07-01T08:00:00+02:00", end_at: "2026-07-01T10:30:00+02:00", provider: "KLM", metadata: { address: "Via Roma 1; Firenze", price: 450, booking_reference: "XYZ123" } },
    { ...base, id: "b", title: "Museum", status: "planned", start_at: "2026-07-02T12:00:00Z", end_at: null },
    { ...base, id: "c", title: "Idee", status: "idea", start_at: "2026-07-03T12:00:00Z", end_at: null },
    { ...base, id: "d", title: "Weg", status: "cancelled", start_at: "2026-07-03T12:00:00Z", end_at: null },
  ], "https://vakansie.app/", new Date("2026-06-01T00:00:00Z"));
  const unfolded = ics.replace(/\r\n /g, "");

  it("uses CRLF and calendar name/timezone", () => {
    expect(ics.split("\n").every((l) => l === "" || l.endsWith("\r"))).toBe(true);
    expect(unfolded).toContain("X-WR-CALNAME:Zomer\\, Italië · Vakansie");
    expect(unfolded).toContain("X-WR-TIMEZONE:Europe/Rome");
  });
  it("adds an all-day trip event through the end date", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20260701");
    expect(ics).toContain("DTEND;VALUE=DATE:20260706");
  });
  it("writes item times in UTC and defaults to one hour", () => {
    expect(ics).toContain("UID:a@vakansie");
    expect(ics).toContain("DTSTART:20260701T060000Z");
    expect(ics).toContain("DTEND:20260701T083000Z");
    expect(ics).toContain("DTSTART:20260702T120000Z\r\nDTEND:20260702T130000Z");
  });
  it("skips idea and cancelled items and marks planned ones", () => {
    expect(ics).not.toContain("UID:c@vakansie");
    expect(ics).not.toContain("UID:d@vakansie");
    expect(ics).toContain("SUMMARY:Museum (nog te regelen)");
  });
  it("takes the address from metadata and links to Reis", () => {
    expect(unfolded).toContain("LOCATION:Via Roma 1\\; Firenze");
    expect(unfolded).toContain("DESCRIPTION:KLM\\nhttps://vakansie.app/trip/t1/reis");
  });
  it("never includes prices or booking references", () => {
    expect(unfolded).not.toContain("450");
    expect(unfolded).not.toContain("XYZ123");
  });
  it("escapes and folds per RFC 5545", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const folded = foldLine("SUMMARY:" + "é".repeat(60));
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe("SUMMARY:" + "é".repeat(60));
  });
});

describe("calendar feed contract", () => {
  const migration = src("drizzle/migrations/0006_calendar_feeds.sql");
  const fn = src("supabase/functions/trip-calendar/index.ts");
  it("rejects revoked feeds and former members in the lookup", () => {
    const body = migration.slice(migration.indexOf("FUNCTION public.resolve_calendar_feed"));
    expect(body).toContain("f.revoked_at IS NULL");
    expect(body).toContain("public.is_trip_member(f.user_id, f.trip_id)");
  });
  it("returns the same 404 for unknown, revoked or non-member tokens", () => {
    expect(fn).toContain('if (resolveError || typeof tripId !== "string") return notFound();');
    expect(fn).toContain("private, max-age=900");
  });
  it("stores only a sha256 hash and keeps feeds private", () => {
    expect(migration).toContain("extensions.digest(v_token, 'sha256')");
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL)[^\n]*calendar_feeds TO authenticated/i);
  });
  it("wipes calendar feeds when Beheer deletes a user", () => {
    const body = migration.slice(migration.indexOf("FUNCTION public.ops_delete_user"));
    expect(body).toContain("DELETE FROM public.calendar_feeds WHERE user_id = p_user_id;");
    expect(body).toContain("DELETE FROM public.payment_details WHERE user_id = p_user_id;");
    expect(body).toContain("DELETE FROM public.trip_traveler_profiles WHERE user_id = p_user_id;");
  });
});
