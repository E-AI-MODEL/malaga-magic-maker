import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(500, { success: false, error: "Server configuration incomplete" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { success: false, error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

    if (claimsError || !userId) {
      return jsonResponse(401, { success: false, error: "Unauthorized" });
    }

    // Firecrawl spends a private API credit. It is not a consumer endpoint in
    // Vakansie 1.0, so only an internal global admin may invoke it.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: adminRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("firecrawl admin check failed:", roleError.message);
      return jsonResponse(500, { success: false, error: "Authorization check failed" });
    }

    if (!adminRole) {
      return jsonResponse(403, { success: false, error: "Forbidden" });
    }

    const { url, options } = await req.json();

    if (typeof url !== "string" || !url.trim()) {
      return jsonResponse(400, { success: false, error: "URL is required" });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return jsonResponse(500, {
        success: false,
        error: "Firecrawl connector niet geconfigureerd. Koppel de Firecrawl-connector in Settings.",
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: options?.formats || ["markdown"],
        onlyMainContent: options?.onlyMainContent ?? true,
        waitFor: options?.waitFor,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse(response.status, {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      });
    }

    return jsonResponse(200, data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to scrape";
    return jsonResponse(500, { success: false, error: errorMessage });
  }
});
