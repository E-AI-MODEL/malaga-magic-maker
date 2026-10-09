import { createClient } from "npm:@supabase/supabase-js@2";
import { handleUnsubscribe, page } from "./handler.ts";

// Public unsubscribe for reminder e-mails. The signed token is the only authorization:
// it names one user and can only switch off that user's e-mail reminders.

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return page(500, "<p>Afmelden lukt nu even niet. Probeer het later opnieuw.</p>");
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return handleUnsubscribe(req, {
    getSecret: async () => {
      const { data } = await db.from("server_job_secrets").select("secret").eq("name", "reminders_unsubscribe").maybeSingle();
      return data?.secret || null;
    },
    disableEmailReminders: async (userId) => {
      const { error } = await db.from("notification_preferences")
        .upsert({ user_id: userId, email_reminders: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      return !error;
    },
  });
});
