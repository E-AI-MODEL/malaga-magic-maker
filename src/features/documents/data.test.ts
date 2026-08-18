import { describe, expect, it } from "vitest";
import { getDocumentTypeLabel, validateDocumentFile } from "./data";

describe("private document presentation and validation", () => {
  it("uses understandable customer labels", () => {
    expect(getDocumentTypeLabel("booking_confirmation")).toBe("Boeking");
    expect(getDocumentTypeLabel("ticket")).toBe("Ticket");
    expect(getDocumentTypeLabel("unknown")).toBe("Document");
  });

  it("accepts a supported small PDF", () => {
    const file = new File(["hello"], "ticket.pdf", { type: "application/pdf" });
    expect(() => validateDocumentFile(file)).not.toThrow();
  });

  it("rejects unsupported files", () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    expect(() => validateDocumentFile(file)).toThrow("Gebruik een PDF, JPG, PNG of WebP-bestand.");
  });

  it("rejects files above 20 MB", () => {
    const file = new File([new Uint8Array(20 * 1024 * 1024 + 1)], "too-large.pdf", { type: "application/pdf" });
    expect(() => validateDocumentFile(file)).toThrow("Het bestand mag maximaal 20 MB zijn.");
  });
});
