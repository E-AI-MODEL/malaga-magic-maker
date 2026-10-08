import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedReturnUrl, parseAllowedOrigins } from "../_shared/url-guards.ts";

// Platform-admin user management. Validates the caller token and the admin
// role server-side BEFORE any service-role call.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser(authHeader.slice(7));
  if (userError || !userData.user) return json(401, { error: "unauthorized" });
  const actor = userData.user.id;

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: roleRow, error: roleError } = await admin
    .from("user_roles").select("id").eq("user_id", actor).eq("role", "admin").maybeSingle();
  if (roleError) { console.error("role check failed", roleError); return json(500, { error: "role_check_failed" }); }
  if (!roleRow) return json(403, { error: "platform_admin_required" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const action = body.action;
  const audit = (a: string, target: string, metadata: Record<string, unknown> = {}) =>
    admin.from("admin_audit_log").insert({ actor_user_id: actor, action: a, target_type: "user", target_id: target, metadata });
  let redirectTo: string | undefined;
  if (body.redirectTo !== undefined && body.redirectTo !== null && body.redirectTo !== "") {
    if (!isAllowedReturnUrl(body.redirectTo, parseAllowedOrigins(Deno.env.get("ALLOWED_APP_ORIGINS")))) {
      return json(400, { error: "invalid_redirect" });
    }
    redirectTo = body.redirectTo;
  }

  if (action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? "").trim().slice(0, 80);
    const mode = body.mode === "password" ? "password" : "invite";
    if (!EMAIL.test(email) || email.length > 255) return json(400, { error: "invalid_email" });
    if (!displayName) return json(400, { error: "invalid_name" });
    const meta = { display_name: displayName, username: email.split("@")[0] };
    let userId: string | undefined;
    if (mode === "invite") {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: meta, redirectTo });
      if (error) return json(400, { error: error.message });
      userId = data.user?.id;
    } else {
      const password = String(body.password ?? "");
      if (password.length < 10 || password.length > 72) return json(400, { error: "password_too_short" });
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
      if (error) return json(400, { error: error.message });
      userId = data.user?.id;
    }
    if (!userId) return json(500, { error: "create_failed" });
    await audit("user.created", userId, { mode, email });
    return json(200, { userId });
  }

  const userId = body.userId;
  if (typeof userId !== "string" || !UUID.test(userId)) return json(400, { error: "invalid_user" });

  if (action === "ban" || action === "unban") {
    if (userId === actor) return json(400, { error: "cannot_block_self" });
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: action === "ban" ? "876000h" : "none" });
    if (error) return json(400, { error: error.message });
    await audit(action === "ban" ? "user.blocked" : "user.unblocked", userId);
    return json(200, { ok: true });
  }

  if (action === "recovery") {
    const { data: u, error: ue } = await admin.auth.admin.getUserById(userId);
    if (ue || !u.user?.email) return json(404, { error: "user_not_found" });
    const { error } = await userClient.auth.resetPasswordForEmail(u.user.email, { redirectTo });
    if (error) return json(400, { error: error.message });
    await audit("user.recovery_sent", userId);
    return json(200, { ok: true });
  }

  return json(400, { error: "unknown_action" });
});
