import { z } from "zod";

export const receiptSuggestionSchema = z.object({
  description: z.string().max(160).nullable(),
  amount: z.number().finite().positive().max(1000000).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  payerName: z.string().max(80).nullable(),
}).strict();

export type ReceiptSuggestion = z.infer<typeof receiptSuggestionSchema>;

const normalizeName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("nl-NL").replace(/\s+/g, " ");

/** Identity is selected locally; only an unambiguous full name or first name matches. */
export function matchReceiptPayer(name: string | null, members: { userId: string; displayName: string }[]): string | null {
  if (!name?.trim()) return null;
  const normalized = normalizeName(name);
  const matches = members.filter((member) => {
    const full = normalizeName(member.displayName);
    return full === normalized || full.split(" ")[0] === normalized;
  });
  return matches.length === 1 ? matches[0].userId : null;
}

export function receiptFileError(file: Pick<File, "type" | "size">): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Kies een JPG-, PNG- of WebP-foto.";
  if (file.size === 0 || file.size > 5 * 1024 * 1024) return "Kies een foto van maximaal 5 MB.";
  return null;
}