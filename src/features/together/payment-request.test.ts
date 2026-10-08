import { describe, expect, it } from "vitest";
import { buildPaymentRequestText } from "./payment-request";

describe("buildPaymentRequestText", () => {
  it("formats the amount in nl-NL currency notation", () => {
    const text = buildPaymentRequestText({
      recipientName: "Sanne",
      tripName: "Zomer in Italië",
      amount: 123.5,
      currency: "EUR",
    });
    expect(text).toBe(
      "Hoi Sanne, voor Zomer in Italië krijg ik nog € 123,50 van je (jouw deel van de gedeelde kosten).",
    );
  });

  it("adds the IBAN line only when both IBAN and account holder are present", () => {
    const withIban = buildPaymentRequestText({
      recipientName: "Sanne",
      tripName: "Zomer in Italië",
      amount: 40,
      currency: "EUR",
      iban: "NL91ABNA0417164300",
      accountName: "J. de Vries",
    });
    expect(withIban).toContain("Je kunt het overmaken naar NL91 ABNA 0417 1643 00 t.n.v. J. de Vries.");

    const withoutAccountName = buildPaymentRequestText({
      recipientName: "Sanne",
      tripName: "Zomer in Italië",
      amount: 40,
      currency: "EUR",
      iban: "NL91ABNA0417164300",
    });
    expect(withoutAccountName).not.toContain("overmaken");
  });

  it("never contains ids or e-mail addresses", () => {
    const text = buildPaymentRequestText({
      recipientName: "Sanne",
      tripName: "Zomer in Italië",
      amount: 40,
      currency: "EUR",
      iban: "NL91ABNA0417164300",
      accountName: "S. Jansen",
    });
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
    expect(text).not.toContain("uuid");
  });
});
