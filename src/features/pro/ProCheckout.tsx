import { useCallback } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

export function ProCheckout({ priceId, returnUrl }: { priceId: string; returnUrl: string }) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId, returnUrl, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Afrekenen is niet gelukt");
    }
    return data.clientSecret as string;
  }, [priceId, returnUrl]);

  return (
    <div id="checkout" className="mt-5">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
