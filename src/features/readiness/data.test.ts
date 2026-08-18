import { describe, expect, it } from "vitest";
import { activeReadinessChecks, parseTripReadiness, readinessHeadline } from "./data";

const sample = {
  status: "attention",
  attention_count: 3,
  checks: [
    { key: "dates", attention_count: 0 },
    { key: "destination", attention_count: 1 },
    { key: "tasks", attention_count: 2 },
    { key: "decisions", attention_count: 0 },
    { key: "bookings", attention_count: 0 },
  ],
  facts: { trip_item_count: 4, document_count: 2, member_count: 3 },
};

describe("trip readiness", () => {
  it("uses human customer language", () => {
    const readiness = parseTripReadiness(sample);
    expect(readinessHeadline(readiness)).toBe("3 dingen regelen");
    expect(activeReadinessChecks(readiness).map((check) => check.label)).toEqual(["Bestemming ontbreekt", "Open taken"]);
  });

  it("describes a zero-attention trip as ready", () => {
    const readiness = parseTripReadiness({ ...sample, status: "ready", attention_count: 0, checks: sample.checks.map((check) => ({ ...check, attention_count: 0 })) });
    expect(readinessHeadline(readiness)).toBe("Klaar voor vertrek");
  });

  it("rejects malformed backend responses", () => {
    expect(() => parseTripReadiness({ status: "ready" })).toThrow("Invalid readiness response");
  });
});
