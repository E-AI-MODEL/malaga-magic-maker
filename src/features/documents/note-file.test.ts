import { describe, expect, it } from "vitest";
import { createNoteFile, noteLines } from "./note-file";
import { validateDocumentFile } from "./data";

describe("trip notes", () => {
  it("keeps each supplied packing item without adding invented items", () => {
    expect(noteLines(" Oplader \n\n Zonnebril\r\n Zwemkleding ")).toEqual(["Oplader", "Zonnebril", "Zwemkleding"]);
  });
  it("rejects an empty list instead of saving an empty file", () => {
    expect(() => createNoteFile("packing", " \n ")).toThrow("Vul je lijst of notitie in.");
  });
  it.each(["packing", "note"] as const)("creates a %s PDF supported by existing private storage", (kind) => {
    const file = createNoteFile(kind, "Oplader\nZonnebril");
    expect(file.name).toBe(kind === "packing" ? "Paklijst.pdf" : "Notitie.pdf");
    expect(file.type).toBe("application/pdf");
    expect(file.size).toBeGreaterThan(100);
    expect(() => validateDocumentFile(file)).not.toThrow();
  });
});