import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie BUILD 01 security contract", () => {
  const foundation = source("supabase/migrations/20260816165000_vakansie_security_foundation.sql");
  const hardening = source("supabase/migrations/20260816165100_vakansie_security_policy_hardening.sql");
  const attachmentLockdown = source("supabase/migrations/20260816165200_disable_public_task_attachment_uploads.sql");
  const hansie = source("supabase/functions/trip-ai-chat/index.ts");
  const firecrawl = source("supabase/functions/firecrawl-scrape/index.ts");
  const opsUsers = source("supabase/functions/ops-admin-users/index.ts");
  const tripContext = source("src/contexts/TripContext.tsx");

  it("removes direct membership joins and creates atomic server RPCs", () => {
    expect(foundation).toContain('DROP POLICY IF EXISTS "Users can join trips"');
    expect(foundation).not.toMatch(/CREATE POLICY\s+"Users can join trips"/);
    expect(foundation).toContain("FUNCTION public.create_trip_with_owner");
    expect(foundation).toContain("FUNCTION public.join_trip_by_code");
    expect(foundation).toContain("VALUES (v_trip_id, v_user_id, 'organizer')");
    expect(foundation).toContain("VALUES (v_trip_id, v_user_id, 'member')");
  });

  it("never grants global admin from user-controlled signup metadata", () => {
    expect(foundation).toContain("VALUES (NEW.id, 'participant')");
    expect(foundation).not.toContain("NEW.raw_user_meta_data->>'role' = 'admin'");
  });

  it("checks Hansie membership before private service-role trip reads", () => {
    const membershipCheck = hansie.indexOf('.from("trip_members")');
    const forbiddenReturn = hansie.indexOf('return jsonError(403, "Forbidden")');
    const privateTripRead = hansie.indexOf('db.from("trip")');

    expect(membershipCheck).toBeGreaterThan(-1);
    expect(forbiddenReturn).toBeGreaterThan(membershipCheck);
    expect(privateTripRead).toBeGreaterThan(forbiddenReturn);
    expect(hansie).not.toContain('db.from("submissions")');
    expect(hansie).not.toContain('db.from("accommodations")');
    expect(hansie).not.toContain("Costa del Sol");
  });

  it("restricts Firecrawl to authenticated internal admins", () => {
    const roleCheck = firecrawl.indexOf('.from("user_roles")');
    const firecrawlCall = firecrawl.indexOf('fetch("https://api.firecrawl.dev');

    expect(firecrawl).toContain('eq("role", "admin")');
    expect(roleCheck).toBeGreaterThan(-1);
    expect(firecrawlCall).toBeGreaterThan(roleCheck);
    expect(firecrawl).toContain('return jsonResponse(403, { success: false, error: "Forbidden" })');
  });

  it("checks platform admin before any admin user action", () => {
    const roleCheck = opsUsers.indexOf('admin.rpc("has_role"');
    expect(roleCheck).toBeGreaterThan(-1);
    expect(opsUsers.indexOf("auth.getUser")).toBeLessThan(roleCheck);
    for (const call of ["inviteUserByEmail", "createUser(", "updateUserById", "resetPasswordForEmail"]) {
      expect(opsUsers.indexOf(call)).toBeGreaterThan(roleCheck);
    }
    expect(opsUsers).toContain('json(403, { error: "platform_admin_required" })');
  });

  it("uses RPCs instead of browser-side trip/member inserts and invite lookup", () => {
    expect(tripContext).toContain('"create_trip_with_owner"');
    expect(tripContext).toContain('"accept_trip_invite"');
    expect(tripContext).not.toContain('"join_trip_by_code"');
    expect(tripContext).not.toContain("invite_code");
    expect(tripContext).not.toContain('.from("trip_members").insert');
    expect(tripContext).not.toContain('.eq("invite_code"');
  });

  it("prevents membership identity swaps and limits assigned task updates", () => {
    expect(hardening).toContain("membership_identity_immutable");
    expect(hardening).toContain("assigned_member_may_only_update_task_progress_and_details");
    expect(hardening).toContain("NEW.trip_id IS DISTINCT FROM OLD.trip_id");
  });

  it("stops new uploads to the public legacy task attachment bucket", () => {
    expect(attachmentLockdown).toContain('DROP POLICY IF EXISTS "Authenticated can upload task attachments"');
    expect(foundation).toContain("'trip-documents'");
    expect(foundation).toContain("false,");
  });
});