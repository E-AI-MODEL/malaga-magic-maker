import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function grantEntitlement(session: any, env: StripeEnv) {
  const userId = session?.metadata?.userId;
  if (!userId) {
    console.log("Checkout session without userId — anonymous support payment, nothing to unlock");
    return;
  }

  const { error } = await getSupabase().from("entitlements").upsert(
    {
      user_id: userId,
      product_id: session?.metadata?.productId ?? "vakansie_pro",
      price_id: session?.metadata?.priceId ?? "unknown",
      stripe_customer_id: typeof session?.customer === "string" ? session.customer : null,
      stripe_session_id: session.id,
      amount_cents: session?.amount_total ?? 0,
      currency: (session?.currency ?? "eur").toLowerCase(),
      environment: env,
      granted_at: new Date().toISOString(),
      expires_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_session_id" },
  );

  if (error) console.error("Failed to store entitlement", error);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") await grantEntitlement(session, env);
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await grantEntitlement(event.data.object, env);
      break;
    case "checkout.session.async_payment_failed":
      console.log("Delayed payment failed for session", event.data.object?.id);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook received with invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
