import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie BUILD 09 platform operations contract", () => {
  const migration = source("supabase/migrations/20260818100000_platform_ops.sql");
  const app = source("src/App.tsx");
  const ops = source("src/pages/Ops.tsx");

  it("requires the internal admin role in every privileged server function", () => {
    const functionNames = [
      "ops_search_users",
      "ops_get_user_overview",
      "ops_search_trips",
      "ops_get_trip_overview",
      "ops_set_trip_status",
      "ops_revoke_trip_invite",
      "ops_get_system_summary",
    ];

    for (const name of functionNames) {
      const start = migration.indexOf(`FUNCTION public.${name}`);
      expect(start).toBeGreaterThan(-1);
      const nextFunction = migration.indexOf("CREATE OR REPLACE FUNCTION", start + 1);
      const body = migration.slice(start, nextFunction === -1 ? undefined : nextFunction);
      expect(body).toContain("platform_admin_required");
      expect(body).toContain("public.has_role");
    }
  });

  it("audits platform mutations instead of silently changing production state", () => {
    expect(migration).toContain("'trip.status_changed'");
    expect(migration).toContain("'invite.revoked'");
    expect(migration).toContain("INSERT INTO public.admin_audit_log");
  });

  it("keeps Beheer separate from normal trip routes and customer navigation", () => {
    expect(app).toContain('path="/ops"');
    expect(app).toContain("PlatformAdminRoute");
    expect(ops).toContain("Beheer");
    expect(ops).not.toContain("service_role");
    expect(ops).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
