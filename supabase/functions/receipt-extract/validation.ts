import { z } from "npm:zod@3.25.76";

export const requestSchema = z.object({
  tripId: z.string().uuid(),
  image: z.string().max(7 * 1024 * 1024),
  consent: z.literal(true),
}).strict();

export const suggestionSchema = z.object({
  description: z.string().max(160).nullable(),
  amount: z.number().finite().positive().max(1000000).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  payerName: z.string().max(80).nullable(),
}).strict();

/** Reject remote URLs and disguised images before contacting the AI service. */
export function validReceiptImage(image: string): boolean {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const bytes = atob(match[2]);
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) return false;
    if (match[1] === "image/jpeg") return bytes.charCodeAt(0) === 255 && bytes.charCodeAt(1) === 216 && bytes.charCodeAt(2) === 255;
    if (match[1] === "image/png") return bytes.slice(0, 8) === "\x89PNG\r\n\x1a\n";
    return bytes.slice(0, 4) === "RIFF" && bytes.slice(8, 12) === "WEBP";
  } catch { return false; }
}

export function receiptAccessAllowed(member: { user_id: string } | null, status: string | null) {
  return Boolean(member && status && status !== "archived");
}