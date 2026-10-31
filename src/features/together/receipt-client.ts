import { supabase } from "@/integrations/supabase/client";
import { receiptSuggestionSchema } from "./receipt";

/** Image lives only in this request; errors contain safe fixed copy, never image content. */
/** tripId null = visitor without an account; the server applies its own daily limit. */
export async function recognizeReceipt(tripId: string | null, image: string, signal: AbortSignal) {
  const body = tripId ? { tripId, image, consent: true } : { guest: true, image, consent: true };
  const { data, error } = await supabase.functions.invoke("receipt-extract", { body, signal });
  if (error) {
    let safeMessage = "Het bonnetje kon niet worden uitgelezen. Vul de kosten handmatig in.";
    if (error.context instanceof Response) {
      try {
        const result: unknown = await error.context.json();
        if (result && typeof result === "object" && "error" in result && typeof result.error === "string" && result.error.length < 250) safeMessage = result.error;
      } catch { /* No upstream error bodies or form content in telemetry. */ }
    }
    throw new Error(safeMessage);
  }
  const suggestion = receiptSuggestionSchema.safeParse(data?.suggestion);
  if (!suggestion.success) throw new Error("De foto leverde geen bruikbaar voorstel op. Vul de kosten handmatig in.");
  return suggestion.data;
}