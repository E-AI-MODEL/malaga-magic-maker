import { jsPDF } from "jspdf";

export type NoteKind = "packing" | "note";

export function noteLines(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("Vul je lijst of notitie in.");
  return lines;
}

/** Use the existing private PDF upload contract, without sending note text to AI. */
export function createNoteFile(kind: NoteKind, text: string): File {
  const lines = noteLines(text);
  const title = kind === "packing" ? "Paklijst" : "Notitie";
  const pdf = new jsPDF();
  pdf.setFontSize(20);
  pdf.text(title, 20, 22);
  pdf.setFontSize(12);
  let y = 36;
  for (const line of lines) {
    const wrapped: string[] = pdf.splitTextToSize(line, kind === "packing" ? 158 : 170);
    for (let index = 0; index < wrapped.length; index += 1) {
      if (y > 275) { pdf.addPage(); y = 22; }
      if (kind === "packing" && index === 0) pdf.rect(20, y - 3.5, 3.5, 3.5);
      pdf.text(wrapped[index], kind === "packing" ? 28 : 20, y);
      y += 7;
    }
    y += 2;
  }
  return new File([pdf.output("arraybuffer")], `${title}.pdf`, { type: "application/pdf" });
}