import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const users = [
    { email: "robin@local.app", password: "neusjevandezalm", username: "Robin", display_name: "Robin", role: "participant" },
    { email: "mark@local.app", password: "allesinboxdrie", username: "Mark", display_name: "Mark", role: "participant" },
    { email: "dimitri@local.app", password: "onebunge", username: "Dimitri", display_name: "Dimitri", role: "participant" },
    { email: "edwin@local.app", password: "hetisgeelennietzwaar", username: "Edwin", display_name: "Edwin", role: "participant" },
    { email: "admin@local.app", password: "hans", username: "Admin", display_name: "Hans", role: "admin" },
  ];

  const results = [];

  for (const u of users) {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
    
    if (existing) {
      results.push({ email: u.email, status: "already_exists" });
      continue;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        username: u.username,
        display_name: u.display_name,
        role: u.role,
      },
    });

    if (error) {
      results.push({ email: u.email, status: "error", error: error.message });
    } else {
      results.push({ email: u.email, status: "created", id: data.user.id });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
