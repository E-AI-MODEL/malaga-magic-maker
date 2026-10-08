import { describe, expect, it } from "vitest";
import { formatIban, isValidIban, normalizeIban } from "./iban";

describe("iban helpers", () => {
  it("normalises to uppercase without spaces", () => {
    expect(normalizeIban("nl91 abna 0417 1643 00")).toBe("NL91ABNA0417164300");
  });

  it("accepts valid IBANs from several countries", () => {
    expect(isValidIban("NL91ABNA0417164300")).toBe(true);
    expect(isValidIban("BE68 5390 0754 7034")).toBe(true);
    expect(isValidIban("FR14 2004 1010 0505 0001 3M02 606")).toBe(true);
  });

  it("rejects malformed or wrong-checksum IBANs", () => {
    expect(isValidIban("NL91ABNA0417164301")).toBe(false);
    expect(isValidIban("NL00ABNA0417164300")).toBe(false);
    expect(isValidIban("hallo")).toBe(false);
    expect(isValidIban("")).toBe(false);
  });

  it("formats in groups of four for display", () => {
    expect(formatIban("NL91ABNA0417164300")).toBe("NL91 ABNA 0417 1643 00");
  });
});
