const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This was a one-off prototype bootstrap endpoint. Production Vakansie must
  // never expose a service-role endpoint that creates hardcoded user accounts.
  return new Response(
    JSON.stringify({ error: "Legacy seed endpoint is disabled" }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
