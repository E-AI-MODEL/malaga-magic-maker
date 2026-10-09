import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";
import { signUnsubscribeToken } from "../_shared/unsubscribe-token.ts";
import { isPushEndpoint, pushServer } from "../_shared/push-server.ts";
import { TEST_REMINDER_LIMIT_MESSAGE, testReminderAllowed } from "../_shared/test-reminder-limit.ts";

// Test reminder for the signed-in user only: push when it is on and works, otherwise e-mail.
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TITLE = "Testmelding van Vakansie";
const BODY = "Zo ziet een herinnering eruit. Je hoeft niets te doen.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Deze actie is niet mogelijk." });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: "De testmelding is niet ingesteld op de server." });
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // SECURITY BOUNDARY: identify the caller before any service-role read.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await db.auth.getUser(token) : { data: null };
  const user = auth?.user;
  if (!user) return json(401, { error: "Je bent niet ingelogd." });

  const { count: recent } = await db.from("reminder_test_events").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if (!testReminderAllowed(recent || 0)) return json(429, { error: TEST_REMINDER_LIMIT_MESSAGE });
  await db.from("reminder_test_events").insert({ user_id: user.id });

  const { data: prefs } = await db.from("notification_preferences").select("push_reminders").eq("user_id", user.id).maybeSingle();
  let pushError = "";
  if (prefs?.push_reminders === true) {
    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", user.id);
    const live = (subs || []).filter((s: { endpoint: string }) => isPushEndpoint(s.endpoint));
    if (live.length) {
      const server = await pushServer(db);
      let ok = false;
      for (const sub of live) {
        try {
          await server.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } })
            .pushTextMessage(JSON.stringify({ title: TITLE, body: BODY, url: "https://vakansie.app/profiel" }), { ttl: 600 });
          ok = true;
        } catch (e) {
          if (e instanceof webpush.PushMessageError) {
            pushError = `pushdienst gaf status ${e.response.status}`;
            await e.response.text().catch(() => "");
          } else pushError = e instanceof Error ? e.message : "onbekende pushfout";
        }
      }
      if (ok) return json(200, { channel: "push" });
    }
  }

  if (!user.email) return json(400, { error: "Er staat geen e-mailadres bij je account." });
  const { data: unsub } = await db.from("server_job_secrets").select("secret").eq("name", "reminders_unsubscribe").maybeSingle();
  try {
    const result = await sendTemplateEmail("reminder", user.email, {
      templateData: {
        title: TITLE, body: BODY, url: "https://vakansie.app/profiel",
        unsubscribeUrl: unsub?.secret
          ? `https://vakansie.app/afmelden?token=${encodeURIComponent(await signUnsubscribeToken(user.id, unsub.secret))}`
          : undefined,
      },
    });
    if (!result.sent) return json(400, { error: "Dit e-mailadres is eerder afgemeld of onbereikbaar gebleken, dus de e-mail is niet verstuurd." });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "onbekende fout";
    return json(502, { error: `De test-e-mail is niet verstuurd: ${reason}${pushError ? ` (push: ${pushError})` : ""}` });
  }
  return json(200, { channel: "email", email: user.email });
});
