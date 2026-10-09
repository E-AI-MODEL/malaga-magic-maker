import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { EmailAPIError } from "npm:@lovable.dev/email-js@0.3.1";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";
import {
  deliveryReminders, inQuietHours, nextChannel, pushFailureAction, withinDailyLimit, type Channel,
} from "../_shared/reminders.ts";

const APP_URL = "https://vakansie.app";
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Only well-known browser push services; never arbitrary URLs from the database. */
export function isPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:" || (u.port && u.port !== "443")) return false;
    const h = u.hostname;
    return h === "fcm.googleapis.com" || h === "updates.push.services.mozilla.com" || h === "web.push.apple.com"
      || h.endsWith(".push.apple.com") || h.endsWith(".notify.windows.com");
  } catch { return false; }
}

type Db = ReturnType<typeof createClient>;

async function pushServer(db: Db) {
  const { data } = await db.from("push_server_keys").select("public_jwk, private_jwk").eq("id", 1).maybeSingle();
  let keys: CryptoKeyPair;
  if (data) {
    keys = await webpush.importVapidKeys({ publicKey: data.public_jwk, privateKey: data.private_jwk });
  } else {
    // First run: generate the server key pair here so the private key never leaves the backend.
    keys = await webpush.generateVapidKeys({ extractable: true });
    const exported = await webpush.exportVapidKeys(keys);
    const { error } = await db.from("push_server_keys").insert({
      id: 1, public_key: await webpush.exportApplicationServerKey(keys),
      public_jwk: exported.publicKey, private_jwk: exported.privateKey,
    });
    if (error) return pushServer(db); // another run won the race
  }
  return webpush.ApplicationServer.new({ contactInformation: APP_URL, vapidKeys: keys });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: "not configured" });
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // SECURITY BOUNDARY: only the scheduled job knows this secret.
  const given = req.headers.get("x-cron-secret") || "";
  const { data: secretRow } = await db.from("server_job_secrets").select("secret").eq("name", "send_reminders").maybeSingle();
  if (!secretRow?.secret || !given || !safeEqual(given, secretRow.secret)) return json(401, { error: "Unauthorized" });

  const { data: sw } = await db.from("app_settings").select("value").eq("key", "reminders_enabled").maybeSingle();
  if (sw?.value === "false") return json(200, { skipped: "disabled" });

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 8 * 86_400_000).toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  const { data: trips, error: tripsError } = await db.from("trip")
    .select("id, name, status, start_date, end_date, timezone")
    .neq("status", "archived").not("start_date", "is", null).lte("start_date", soon)
    .or(`end_date.gte.${yesterday},and(end_date.is.null,start_date.gte.${yesterday})`);
  if (tripsError) return json(500, { error: "trips" });

  // Always ensure the key pair exists, so devices can subscribe before the first reminder.
  let server: webpush.ApplicationServer | null = await pushServer(db);
  let emailPaused = false;
  const stats = { push: 0, email: 0, removed: 0 };

  for (const trip of trips || []) {
    if (inQuietHours(now, trip.timezone)) continue;
    const [{ data: members }, { data: items }, { data: decisions }, { data: tasks }] = await Promise.all([
      db.from("trip_members").select("user_id").eq("trip_id", trip.id),
      db.from("trip_items").select("id, title, type, status, start_at").eq("trip_id", trip.id),
      db.from("decisions").select("id, title, status, closes_at").eq("trip_id", trip.id).eq("status", "open"),
      db.from("tasks").select("id, title, status, due_at, assigned_user_id").eq("trip_id", trip.id).not("due_at", "is", null),
    ]);
    const decisionIds = (decisions || []).map((d: { id: string }) => d.id);
    const { data: votes } = decisionIds.length
      ? await db.from("decision_votes").select("decision_id, user_id").in("decision_id", decisionIds)
      : { data: [] };

    for (const { user_id: userId } of members || []) {
      const reminders = deliveryReminders({
        now, trip, items: items || [],
        myTasks: (tasks || []).filter((t: { assigned_user_id: string | null }) => t.assigned_user_id === userId),
        decisions: (decisions || []).map((d: { id: string; title: string; status: string; closes_at: string | null }) => ({
          ...d, hasMyVote: (votes || []).some((v: { decision_id: string; user_id: string }) => v.decision_id === d.id && v.user_id === userId),
        })),
      });
      if (!reminders.length) continue;

      const [{ data: prefs }, { data: subs }, { data: sent }, { count: sentToday }] = await Promise.all([
        db.from("notification_preferences").select("push_reminders, email_reminders").eq("user_id", userId).maybeSingle(),
        db.from("push_subscriptions").select("id, endpoint, p256dh, auth, failed_count").eq("user_id", userId),
        db.from("reminder_deliveries").select("reminder_key, channel").eq("user_id", userId).in("reminder_key", reminders.map((r) => r.key)),
        db.from("reminder_deliveries").select("id", { count: "exact", head: true }).eq("user_id", userId)
          .gte("sent_at", new Date(now.getTime() - 86_400_000).toISOString()),
      ]);
      const pushEnabled = prefs?.push_reminders === true;
      const emailEnabled = prefs ? prefs.email_reminders !== false : true;
      const pending = reminders.filter((r) => !(sent || []).some((s: { reminder_key: string }) => s.reminder_key === r.key));
      let liveSubs = (subs || []).filter((s: { endpoint: string }) => isPushEndpoint(s.endpoint));

      for (const reminder of withinDailyLimit(pending, sentToday || 0)) {
        const url = `${APP_URL}${reminder.path}`;
        const opts = { pushEnabled, hasSubscriptions: liveSubs.length > 0, emailEnabled, alreadySent: [] as Channel[] };
        let channel = nextChannel(opts);
        let delivered: Channel | null = null;

        if (channel === "push") {
          server ??= await pushServer(db);
          let ok = false;
          for (const sub of [...liveSubs]) {
            try {
              await server.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } })
                .pushTextMessage(JSON.stringify({ title: reminder.title, body: reminder.body, url }), { ttl: 6 * 3600 });
              ok = true;
              await db.from("push_subscriptions").update({ last_success_at: now.toISOString(), failed_count: 0 }).eq("id", sub.id);
            } catch (e) {
              const status = e instanceof webpush.PushMessageError ? e.response.status : 0;
              if (e instanceof webpush.PushMessageError) await e.response.text().catch(() => "");
              if (pushFailureAction(status) === "delete") {
                await db.from("push_subscriptions").delete().eq("id", sub.id);
                liveSubs = liveSubs.filter((s: { id: string }) => s.id !== sub.id);
                stats.removed++;
              } else {
                await db.from("push_subscriptions").update({ failed_count: (sub.failed_count || 0) + 1 }).eq("id", sub.id);
              }
            }
          }
          if (ok) delivered = "push";
          channel = nextChannel({ ...opts, pushSucceeded: ok });
        }

        if (channel === "email" && !emailPaused) {
          const { data: authUser } = await db.auth.admin.getUserById(userId);
          const email = authUser?.user?.email;
          if (email) {
            try {
              const result = await sendTemplateEmail("reminder", email, {
                templateData: { title: reminder.title, body: reminder.body, url },
                idempotencyKey: `reminder-${userId}-${reminder.key}`,
              });
              if (result.sent) delivered = "email";
            } catch (e) {
              if (e instanceof EmailAPIError && e.status === 429) emailPaused = true; // rest goes next round
              else console.error("reminder email failed:", e instanceof Error ? e.message : e);
            }
          }
        }

        if (delivered) {
          stats[delivered]++;
          await db.from("reminder_deliveries").insert({ user_id: userId, trip_id: trip.id, reminder_key: reminder.key, channel: delivered });
        }
      }
    }
  }
  return json(200, stats);
});
