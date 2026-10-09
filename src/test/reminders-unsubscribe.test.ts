import { describe, expect, it, vi } from "vitest";
import { handleUnsubscribe, DONE, QUESTION } from "../../supabase/functions/reminders-unsubscribe/handler";
import { signUnsubscribeToken } from "../../supabase/functions/_shared/unsubscribe-token";
import { paymentDetailsError } from "@/features/together/iban";

const user = "638d717f-4943-4993-9b79-b9a79f6f69ec";
const secret = "test-secret";
const base = "https://x.test/functions/v1/reminders-unsubscribe";

function deps() {
  return { getSecret: async () => secret, disableEmailReminders: vi.fn(async () => true) };
}

describe("reminders-unsubscribe", () => {
  it("GET only shows the question and a POST form, without unsubscribing", async () => {
    const d = deps();
    const token = await signUnsubscribeToken(user, secret);
    const res = await handleUnsubscribe(new Request(`${base}?token=${token}`), d);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain(QUESTION);
    expect(html).toContain('<form method="post">');
    expect(html).toContain("Ja, afmelden");
    expect(d.disableEmailReminders).not.toHaveBeenCalled();
  });

  it("POST with the form token switches e-mail reminders off for that user", async () => {
    const d = deps();
    const token = await signUnsubscribeToken(user, secret);
    const res = await handleUnsubscribe(new Request(base, { method: "POST", body: new URLSearchParams({ token }) }), d);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(DONE);
    expect(d.disableEmailReminders).toHaveBeenCalledWith(user);
  });

  it("POST with a forged token changes nothing", async () => {
    const d = deps();
    const token = await signUnsubscribeToken(user, "other-secret");
    const res = await handleUnsubscribe(new Request(base, { method: "POST", body: new URLSearchParams({ token }) }), d);
    expect(res.status).toBe(400);
    expect(d.disableEmailReminders).not.toHaveBeenCalled();
  });
});

describe("payment details", () => {
  it("an IBAN needs the account holder name", () => {
    expect(paymentDetailsError("NL91ABNA0417164300", " ")).toBe(
      "Vul ook de naam van de rekeninghouder in, anders staat je IBAN niet in betaalverzoeken.",
    );
    expect(paymentDetailsError("NL91ABNA0417164300", "J. Jansen")).toBeNull();
    expect(paymentDetailsError("", "")).toBeNull();
  });
});
