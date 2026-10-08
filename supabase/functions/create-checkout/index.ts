import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isAllowedReturnUrl, parseAllowedOrigins } from "../_shared/url-guards.ts";
import { type StripeEnv, createStripeClient, getServerStripeEnv } from "../_shared/stripe.ts";

const ALLOWED_PRICE_IDS = new Set(["vakansie_pro_2", "vakansie_pro_5", "vakansie_pro_10"]);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const priceId = String(body?.priceId ?? "");
    const returnUrl = typeof body?.returnUrl === "string" ? body.returnUrl : "";

    if (!ALLOWED_PRICE_IDS.has(priceId)) return json({ error: "Onbekend product" }, 400);
    if (!isAllowedReturnUrl(returnUrl, parseAllowedOrigins(Deno.env.get("ALLOWED_APP_ORIGINS")))) return json({ error: "Ongeldige return url" }, 400);

    // Optional auth: anonymous supporters are allowed, but a signed-in user is
    // resolved server-side so the purchase can never be attributed to someone else.
    let userId: string | undefined;
    let email: string | undefined;
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        email = user.email ?? undefined;
      }
    }

    const env: StripeEnv = getServerStripeEnv();
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) return json({ error: "Product niet gevonden" }, 404);
    const stripePrice = prices.data[0];

    const productId = typeof stripePrice.product === "string"
      ? stripePrice.product
      : stripePrice.product.id;
    const product = await stripe.products.retrieve(productId);

    const customerId = (userId || email)
      ? await resolveOrCreateCustomer(stripe, { email, userId })
      : undefined;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      payment_intent_data: { description: product.name },
      metadata: {
        ...(userId && { userId }),
        priceId,
        productId: "vakansie_pro",
      },
      managed_payments: { enabled: true },
    } as Parameters<typeof stripe.checkout.sessions.create>[0]);

    return json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error("create-checkout error", error);
    return json({ error: "Afrekenen is niet gelukt" }, 500);
  }
});
