import { describe, expect, it } from "vitest";
import { signUnsubscribeToken, verifyUnsubscribeToken, UNSUBSCRIBE_TTL_SECONDS } from "../../supabase/functions/_shared/unsubscribe-token";

const user = "638d717f-4943-4993-9b79-b9a79f6f69ec";
const secret = "test-secret-value";
const now = new Date("2026-10-09T10:00:00Z");

describe("reminder unsubscribe token", () => {
  it("signs and verifies to the same user", async () => {
    const token = await signUnsubscribeToken(user, secret, now);
    expect(await verifyUnsubscribeToken(token, secret, now)).toBe(user);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signUnsubscribeToken(user, "other-secret", now);
    expect(await verifyUnsubscribeToken(token, secret, now)).toBeNull();
  });

  it("rejects a tampered user id", async () => {
    const token = await signUnsubscribeToken(user, secret, now);
    const [, sig] = token.split(".");
    const forged = btoa(`00000000-0000-0000-0000-000000000000.${Math.floor(now.getTime() / 1000) + 999}`)
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verifyUnsubscribeToken(`${forged}.${sig}`, secret, now)).toBeNull();
    expect(await verifyUnsubscribeToken("garbage", secret, now)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signUnsubscribeToken(user, secret, now);
    const later = new Date(now.getTime() + (UNSUBSCRIBE_TTL_SECONDS + 1) * 1000);
    expect(await verifyUnsubscribeToken(token, secret, later)).toBeNull();
  });
});
