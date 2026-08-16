import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie BUILD 01 security contract", () => {
  const foundation = source("supabase/migrations/20260816165000_vakansie_security_foundation.sql");
  const hardening = source("supabase/migrations/20260816165100_vakansie_security_policy_hardening.sql");
  const hansie = source("supabase/functions/trip-ai-chat/index.ts");
  const firecrawl = source("supabase/functions/firecrawl-scrape/index.ts");
  const seedUsers = source("supabase/functions/seed-users/index.ts");
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
    const privateReads = hansie.indexOf("const [tripRes");

    expect(membershipCheck).toBeGreaterThan(-1);
    expect(privateReads).toBeGreaterThan(membershipCheck);
    expect(hansie).toContain('return jsonError(403, "Forbidden")');
  });

  it("restricts Firecrawl to authenticated internal admins", () => {
    const roleCheck = firecrawl.indexOf('.from("user_roles")');
    const firecrawlCall = firecrawl.indexOf('fetch("https://api.firecrawl.dev');

    expect(firecrawl).toContain('eq("role", "admin")');
    expect(firecrawl).toContain("status: false").not;
    expect(roleCheck).toBeGreaterThan(-1);
    expect(firecrawlCall).toBeGreaterThan(roleCheck);
    expect(firecrawl).toContain("Forbidden");
  });

  it("keeps the legacy account seeder disabled and credential-free", () => {
    expect(seedUsers).toContain("Legacy seed endpoint is disabled");
    expect(seedUsers).toContain("status: 410");
    expect(seedUsers).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(seedUsers).not.toContain("password:");
    expect(seedUsers).not.toContain("@local.app");
  });

  it("uses RPCs instead of browser-side trip/member inserts and invite lookup", () => {
    expect(tripContext).toContain('"create_trip_with_owner"');
    expect(tripContext).toContain('"join_trip_by_code"');
    expect(tripContext).not.toContain('.from("trip_members").insert');
    expect(tripContext).not.toContain('.eq("invite_code"');
  });

  it("prevents membership identity swaps and limits assigned task updates", () => {
    expect(hardening).toContain("membership_identity_immutable");
    expect(hardening).toContain("assigned_member_may_only_update_task_progress_and_details");
    expect(hardening).toContain("NEW.trip_id IS DISTINCT FROM OLD.trip_id");
  });
});
