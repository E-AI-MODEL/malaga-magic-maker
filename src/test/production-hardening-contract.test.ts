import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie BUILD 12 production hardening contract", () => {
  const migration = source("supabase/migrations/20260818130000_production_hardening.sql");
  const hansie = source("supabase/functions/trip-ai-chat/index.ts");
  const reporter = source("src/features/observability/ClientErrorReporter.tsx");
  const sanitizer = source("src/features/observability/clientErrors.ts");

  it("keeps telemetry tables unavailable for normal browser inserts", () => {
    expect(migration).toContain("REVOKE ALL ON public.ai_usage_events FROM anon, authenticated");
    expect(migration).toContain("REVOKE ALL ON public.client_error_events FROM anon, authenticated");
    expect(migration).not.toContain("GRANT INSERT ON public.ai_usage_events TO authenticated");
    expect(migration).not.toContain("GRANT INSERT ON public.client_error_events TO authenticated");
  });

  it("authorizes trip-scoped client errors and rate limits them server-side", () => {
    expect(migration).toContain("public.is_trip_member(v_user_id,p_trip_id)");
    expect(migration).toContain("v_recent>=20");
    expect(migration).toContain("octet_length(v_context::text) > 4096");
  });

  it("records Hansie usage only after membership authorization and stores no conversation text", () => {
    const forbidden = hansie.indexOf('return jsonError(403, "Forbidden")');
    const telemetry = hansie.indexOf('consume_hansie_quota');
    expect(forbidden).toBeGreaterThan(-1);
    expect(telemetry).toBeGreaterThan(forbidden);
    const telemetryBlock = hansie.slice(telemetry, telemetry + 350);
    expect(telemetryBlock).toContain("p_trip_id: tripId");
    expect(hansie).not.toContain('.from("ai_usage_events")');
    expect(telemetryBlock).not.toContain("messages");
    expect(telemetryBlock).not.toContain("systemPrompt");
  });

  it("does not send browser route URLs or conversation data in the global error reporter", () => {
    expect(reporter).not.toContain("location.href");
    expect(reporter).not.toContain("location.pathname");
    expect(reporter).not.toContain("messages");
    expect(sanitizer).toContain("JWT_LIKE");
    expect(sanitizer).toContain("BEARER");
    expect(sanitizer).toContain("URL");
  });
});
