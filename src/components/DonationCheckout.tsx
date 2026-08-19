import { useCallback } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

export function DonationCheckout({
  amountInCents,
  customerEmail,
  returnUrl,
}: {
  amountInCents: number;
  customerEmail?: string;
  returnUrl: string;
}) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
      body: { amountInCents, customerEmail, returnUrl, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Afrekenen is niet gelukt");
    }
    return data.clientSecret as string;
  }, [amountInCents, customerEmail, returnUrl]);

  return (
    <div id="checkout" className="mt-5">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
