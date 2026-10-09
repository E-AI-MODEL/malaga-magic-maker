import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Self-service account deletion. The database function runs as the caller (auth.uid()),
// so a user can only ever delete themselves. Document files of removed trips are then
// deleted from private storage with the service role.
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MESSAGES: Record<string, string> = {
  email_mismatch: "Dit e-mailadres hoort niet bij je account.",
  platform_admin_cannot_self_delete: "Je bent platformbeheerder. Laat eerst je beheerrol intrekken door een andere beheerder.",
  not_authenticated: "Je bent niet ingelogd.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Deze actie is niet mogelijk." });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization") || "";
  if (!url || !anon || !serviceRole) return json(500, { error: "Verwijderen is niet ingesteld op de server." });
  if (!auth.startsWith("Bearer ")) return json(401, { error: MESSAGES.not_authenticated });

  const body = await req.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.slice(0, 320) : "";
  if (!email) return json(400, { error: "Vul je e-mailadres in." });

  // SECURITY BOUNDARY: the RPC runs with the caller's own token.
  const asUser = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data, error } = await asUser.rpc("delete_my_account", { p_email: email });
  if (error) {
    const key = Object.keys(MESSAGES).find((k) => error.message.includes(k));
    return json(key === "not_authenticated" ? 401 : 400, { error: key ? MESSAGES[key] : "Verwijderen is niet gelukt. Probeer het later opnieuw." });
  }

  const paths = ((data as { storage_paths?: string[] })?.storage_paths || []).filter((p) => typeof p === "string" && p);
  if (paths.length) {
    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
    for (let i = 0; i < paths.length; i += 100) {
      const { error: rmError } = await admin.storage.from("trip-documents").remove(paths.slice(i, i + 100));
      if (rmError) console.error("document cleanup failed:", rmError.message);
    }
  }
  return json(200, { ok: true });
});
