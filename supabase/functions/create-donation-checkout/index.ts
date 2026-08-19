import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const MIN_CENTS = 100;
const MAX_CENTS = 50000;

async function createDonationCheckout(options: {
  amountInCents: number;
  customerEmail?: string;
  returnUrl: string;
  environment: StripeEnv;
}) {
  const stripe = createStripeClient(options.environment);

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Vakansie steunen" },
          unit_amount: options.amountInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    ui_mode: "embedded_page",
    return_url: options.returnUrl,
    payment_intent_data: { description: "Vakansie steunen" },
    ...(options.customerEmail && { customer_email: options.customerEmail }),
  });

  return session.client_secret;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const amountInCents = Number(body?.amountInCents);
    const environment = body?.environment;
    const returnUrl = typeof body?.returnUrl === "string" ? body.returnUrl : "";
    const customerEmail = typeof body?.customerEmail === "string" ? body.customerEmail : undefined;

    if (!Number.isInteger(amountInCents) || amountInCents < MIN_CENTS || amountInCents > MAX_CENTS) {
      return new Response(JSON.stringify({ error: "Ongeldig bedrag" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (environment !== "sandbox" && environment !== "live") {
      return new Response(JSON.stringify({ error: "Ongeldige omgeving" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!returnUrl.startsWith("http")) {
      return new Response(JSON.stringify({ error: "Ongeldige return url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientSecret = await createDonationCheckout({
      amountInCents,
      customerEmail,
      returnUrl,
      environment,
    });

    return new Response(JSON.stringify({ clientSecret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-donation-checkout error", error);
    return new Response(JSON.stringify({ error: "Afrekenen is niet gelukt" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
