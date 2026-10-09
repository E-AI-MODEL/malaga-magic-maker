import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyUnsubscribeToken } from "../_shared/unsubscribe-token.ts";

// Public one-click unsubscribe for reminder e-mails. The signed token is the only authorization:
// it names one user and can only switch off that user's e-mail reminders.

const page = (status: number, message: string) =>
  new Response(
    `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vakansie</title></head>` +
      `<body style="margin:0;background:#f4f1ea;font-family:Barlow,Arial,sans-serif;color:#1d201f">` +
      `<main style="max-width:420px;margin:15vh auto;padding:0 24px"><p style="font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#ff6a00;font-size:13px">Vakansie</p>` +
      `<p style="font-size:18px;line-height:1.5">${message}</p><p><a href="https://vakansie.app/profiel" style="color:#1d201f">Naar Profiel</a></p></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") return page(405, "Deze actie is niet mogelijk.");
  const token = new URL(req.url).searchParams.get("token") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return page(500, "Afmelden lukt nu even niet. Probeer het later opnieuw.");
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: secretRow } = await db.from("server_job_secrets").select("secret").eq("name", "reminders_unsubscribe").maybeSingle();
  const userId = secretRow?.secret ? await verifyUnsubscribeToken(token, secretRow.secret) : null;
  if (!userId) return page(400, "Deze afmeldlink is ongeldig of verlopen. Je kunt herinneringen uitzetten in Profiel.");

  const { error } = await db.from("notification_preferences")
    .upsert({ user_id: userId, email_reminders: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return page(500, "Afmelden lukt nu even niet. Probeer het later opnieuw.");
  return page(200, "Je krijgt geen herinneringen meer per e-mail. Je kunt ze weer aanzetten in Profiel.");
});
