import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie BUILD 10 activity and notifications contract", () => {
  const foundation = source("supabase/migrations/20260818110000_activity_notifications.sql");
  const hardening = source("supabase/migrations/20260818141500_harden_notification_access.sql");
  const center = source("src/components/NotificationCenter.tsx");

  it("scopes activity to trip members", () => {
    expect(foundation).toContain('CREATE POLICY "Trip members can read activity"');
    expect(foundation).toContain("public.is_trip_member(auth.uid(), trip_id)");
  });

  it("removes prototype notification policy bypasses and client forging", () => {
    expect(hardening).toContain('DROP POLICY IF EXISTS "Users can read own notifications"');
    expect(hardening).toContain('DROP POLICY IF EXISTS "Users can update own notifications"');
    expect(hardening).toContain('DROP POLICY IF EXISTS "Trip members can insert notifications"');
    expect(hardening).toContain("REVOKE INSERT ON public.notifications FROM authenticated");
  });

  it("keeps product events server-emitted and meaningful", () => {
    expect(foundation).toContain("task.assigned");
    expect(foundation).toContain("task.completed");
    expect(foundation).toContain("decision.created");
    expect(foundation).toContain("decision.closed");
    expect(foundation).toContain("member.joined");
    expect(foundation).toContain("trip.updated");
  });

  it("does not fetch a global profile directory to render notifications", () => {
    expect(center).not.toContain('.from("profiles")');
    expect(center).toContain("notificationDestination");
  });
});
