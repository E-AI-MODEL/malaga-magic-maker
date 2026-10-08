import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("payment details privacy contract", () => {
  const migration = source("drizzle/migrations/0003_payment_details_private.sql");
  const sheet = source("src/features/together/PaymentRequestSheet.tsx");

  it("keeps payment_details strictly private per user", () => {
    expect(migration).toContain("CREATE TABLE public.payment_details");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).toContain("TO authenticated");
    expect(migration).not.toMatch(/GRANT[^\n]*payment_details[^\n]*TO anon/i);
  });

  it("wipes payment_details when Beheer deletes a user", () => {
    const start = migration.indexOf("CREATE OR REPLACE FUNCTION public.ops_delete_user");
    expect(start).toBeGreaterThan(-1);
    const body = migration.slice(start);
    expect(body).toContain("DELETE FROM public.payment_details WHERE user_id = p_user_id");
  });

  it("deletes all of the target user's traveler profiles before removing their account", () => {
    const current = source("drizzle/migrations/0005_ops_delete_user_traveler_privacy.sql");
    const deletion = "DELETE FROM public.trip_traveler_profiles WHERE user_id = p_user_id;";
    expect(current).toContain("CREATE OR REPLACE FUNCTION public.ops_delete_user(p_user_id uuid)");
    expect(current).toContain(deletion);
    expect(current.indexOf(deletion)).toBeLessThan(current.indexOf("DELETE FROM public.trip_members"));
    expect(current).toContain("platform_admin_required");
    expect(current).toContain("cannot_delete_self");
    expect(current).toContain("cannot_delete_platform_admin");
    expect(current).toContain("DELETE FROM public.payment_details WHERE user_id = p_user_id;");
  });

  it("shares the payment request without leaking technical identifiers", () => {
    expect(sheet).toContain("encodeURIComponent(text)");
    expect(sheet).toContain('rel="noopener noreferrer"');
    expect(sheet).not.toContain("user_id");
    expect(sheet).not.toContain("tripId");
  });
});
