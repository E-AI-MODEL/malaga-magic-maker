import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Reads the checkout session from Stripe and grants Pro when it is really paid. */
async function verifySession(env: StripeEnv, sessionId: string, userId: string, email?: string) {
  const stripe = createStripeClient(env);
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "payment_intent"],
  });

  if (session.payment_status === "unpaid") return { granted: false, reason: "pending" as const };

  // The purchase may only be attributed to the user who actually paid.
  const sessionUserId = session.metadata?.userId;
  const customer = session.customer as { id?: string; email?: string; metadata?: Record<string, string> } | string | null;
  const customerId = typeof customer === "string" ? customer : customer?.id ?? null;
  const customerUserId = typeof customer === "object" ? customer?.metadata?.userId : undefined;
  const sessionEmail = session.customer_details?.email ?? (typeof customer === "object" ? customer?.email : undefined);

  const ownedByUser = sessionUserId === userId
    || customerUserId === userId
    || (!sessionUserId && !customerUserId && !!email && !!sessionEmail && email.toLowerCase() === sessionEmail.toLowerCase());

  if (!ownedByUser) return { granted: false, reason: "not_yours" as const };

  const { error } = await supabase.from("entitlements").upsert(
    {
      user_id: userId,
      product_id: session.metadata?.productId ?? "vakansie_pro",
      price_id: session.metadata?.priceId ?? "unknown",
      stripe_customer_id: customerId,
      stripe_session_id: session.id,
      amount_cents: session.amount_total ?? 0,
      currency: (session.currency ?? "eur").toLowerCase(),
      environment: env,
      granted_at: new Date().toISOString(),
      expires_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_session_id" },
  );
  if (error) throw new Error(error.message);

  return { granted: true, reason: "ok" as const };
}

/** Payment history from our own records, enriched with Stripe receipt links. */
async function history(env: StripeEnv, userId: string) {
  const { data: rows } = await supabase
    .from("entitlements")
    .select("stripe_session_id, amount_cents, currency, granted_at, environment, price_id")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false })
    .limit(25);

  const stripe = createStripeClient(env);
  const items = [] as Array<Record<string, unknown>>;

  for (const row of rows ?? []) {
    let receiptUrl: string | null = null;
    if (row.environment === env) {
      try {
        const session = await stripe.checkout.sessions.retrieve(String(row.stripe_session_id), {
          expand: ["payment_intent.latest_charge"],
        });
        const intent = session.payment_intent as { latest_charge?: { receipt_url?: string } } | null;
        receiptUrl = intent?.latest_charge?.receipt_url ?? null;
      } catch (_e) {
        receiptUrl = null;
      }
    }
    items.push({
      id: row.stripe_session_id,
      amountCents: row.amount_cents,
      currency: row.currency,
      grantedAt: row.granted_at,
      environment: row.environment,
      priceId: row.price_id,
      receiptUrl,
    });
  }

  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Niet ingelogd" }, 401);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Niet ingelogd" }, 401);

    const body = await req.json();
    const environment = body?.environment;
    if (environment !== "sandbox" && environment !== "live") return json({ error: "Ongeldige omgeving" }, 400);
    const env: StripeEnv = environment;

    if (body?.action === "verify") {
      const sessionId = String(body?.sessionId ?? "");
      if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return json({ error: "Ongeldige sessie" }, 400);
      return json(await verifySession(env, sessionId, user.id, user.email ?? undefined));
    }

    if (body?.action === "history") {
      return json({ items: await history(env, user.id) });
    }

    return json({ error: "Onbekende actie" }, 400);
  } catch (error) {
    console.error("payments-account error", error);
    return json({ error: "Kon betaalgegevens niet ophalen" }, 500);
  }
});
