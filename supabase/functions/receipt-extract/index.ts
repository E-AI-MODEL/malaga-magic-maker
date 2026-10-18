import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { GatewayError } from "@lovable.dev/ai-gateway";
import { extractReceipt } from "./extract.ts";
import { receiptAccessAllowed, requestSchema, validReceiptImage } from "./validation.ts";

export async function handleReceiptRequest(req: Request) {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Gebruik een foto om een bonnetje uit te lezen." }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Log opnieuw in om je bonnetje uit te lezen." }, 401);

  try {
    // User-scoped client: no service-role reads or writes, even after membership validation.
    const client = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_ANON_KEY") || "", { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ error: "Log opnieuw in om je bonnetje uit te lezen." }, 401);
    if (Number(req.headers.get("content-length")) > 7 * 1024 * 1024) return json({ error: "Kies een foto van maximaal 5 MB." }, 413);
    const raw = await req.text();
    if (raw.length > 7 * 1024 * 1024) return json({ error: "Kies een foto van maximaal 5 MB." }, 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json({ error: "Dit bonnetje kon niet worden gelezen. Kies opnieuw een foto." }, 400); }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success || !validReceiptImage(parsed.data.image)) return json({ error: "Kies een geldige JPG-, PNG- of WebP-foto en bevestig het uitlezen." }, 400);
    const { tripId, image } = parsed.data;
    const [membership, trip] = await Promise.all([
      client.from("trip_members").select("user_id").eq("trip_id", tripId).eq("user_id", auth.user.id).maybeSingle(),
      client.from("trip").select("status").eq("id", tripId).maybeSingle(),
    ]);
    if (membership.error || trip.error || !receiptAccessAllowed(membership.data, trip.data?.status || null)) return json({ error: "Je kunt voor deze reis geen bonnetje uitlezen." }, 403);
    const suggestion = await extractReceipt(image, req.signal);
    return json({ suggestion });
  } catch (error) {
    // Never log the image, extraction, names, request body or upstream error message.
    if (error instanceof GatewayError) {
      const status = error.httpStatus || 502;
      const message = status === 402 ? "Bonnetjes uitlezen is nu niet beschikbaar: het AI-tegoed is op. Vul de kosten handmatig in."
        : status === 403 ? "De AI-dienst heeft deze aanvraag geweigerd. Vul de kosten handmatig in."
        : status === 429 ? "Er worden nu te veel bonnetjes uitgelezen. Vul de kosten handmatig in of probeer het later."
        : "Het bonnetje kon niet worden uitgelezen. Je kunt de kosten handmatig invullen.";
      return json({ error: message }, status >= 400 && status < 600 ? status : 502);
    }
    return json({ error: "Het bonnetje kon niet worden uitgelezen. Je kunt de kosten handmatig invullen." }, 422);
  }
}

Deno.serve(handleReceiptRequest);