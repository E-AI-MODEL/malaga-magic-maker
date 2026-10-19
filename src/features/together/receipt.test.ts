import { describe, expect, it } from "vitest";
import { matchReceiptPayer, receiptFileError, receiptSuggestionSchema } from "./receipt";

describe("temporary receipt proposals", () => {
  const members = [{ userId: "a", displayName: "Sanne Janssen" }, { userId: "b", displayName: "Piet Visser" }];
  it("links one readable name to an existing traveler locally", () => {
    expect(matchReceiptPayer("  SANNE  ", members)).toBe("a");
    expect(matchReceiptPayer("Piet Visser", members)).toBe("b");
  });
  it("does not guess ambiguous, unknown or unreadable handwriting", () => {
    expect(matchReceiptPayer("Sanne", [...members, { userId: "c", displayName: "Sanne Visser" }])).toBeNull();
    expect(matchReceiptPayer("Sa?", members)).toBeNull();
    expect(matchReceiptPayer("unknown", members)).toBeNull();
    expect(matchReceiptPayer(null, members)).toBeNull();
  });
  it("only accepts JPG PNG WebP files up to 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(receiptFileError({ type, size: 5 * 1024 * 1024 })).toBeNull();
    expect(receiptFileError({ type: "application/pdf", size: 100 })).not.toBeNull();
    expect(receiptFileError({ type: "image/jpeg", size: 0 })).not.toBeNull();
    expect(receiptFileError({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).not.toBeNull();
  });
  it("keeps missing fields unknown and excludes raw OCR and image data", () => {
    const empty = { description: null, amount: null, currency: null, date: null, payerName: null };
    expect(receiptSuggestionSchema.parse(empty)).toEqual(empty);
    expect(receiptSuggestionSchema.safeParse({ ...empty, rawText: "private" }).success).toBe(false);
    expect(receiptSuggestionSchema.safeParse({ ...empty, image: "private" }).success).toBe(false);
    expect(receiptSuggestionSchema.safeParse({ ...empty, amount: -12 }).success).toBe(false);
  });
});