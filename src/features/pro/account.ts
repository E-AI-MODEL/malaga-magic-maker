import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";

export interface PaymentRecord {
  id: string;
  amountCents: number;
  currency: string;
  grantedAt: string;
  environment: "sandbox" | "live";
  priceId: string;
  receiptUrl: string | null;
}

export type VerifyResult =
  | { granted: true }
  | { granted: false; reason: "pending" | "not_yours" | "error" };

/** Server-side re-check of a checkout session; recovers a payment when the webhook missed it. */
export async function verifyCheckoutSession(sessionId: string): Promise<VerifyResult> {
  if (!paymentsConfigured()) return { granted: false, reason: "error" };
  const { data, error } = await supabase.functions.invoke("payments-account", {
    body: { action: "verify", sessionId, environment: getStripeEnvironment() },
  });
  if (error || !data) return { granted: false, reason: "error" };
  if (data.granted) return { granted: true };
  return { granted: false, reason: data.reason === "pending" || data.reason === "not_yours" ? data.reason : "error" };
}

export async function fetchPaymentHistory(): Promise<PaymentRecord[]> {
  if (!paymentsConfigured()) return [];
  const { data, error } = await supabase.functions.invoke("payments-account", {
    body: { action: "history", environment: getStripeEnvironment() },
  });
  if (error || !data?.items) return [];
  return data.items as PaymentRecord[];
}

export function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: currency.toUpperCase() }).format(
    amountCents / 100,
  );
}
