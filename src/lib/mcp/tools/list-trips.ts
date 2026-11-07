import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_trips",
  title: "List trips",
  description: "List the trips the signed-in user is a member of, with dates and destination.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const db = supabaseForUser(ctx);
    const { data, error } = await db
      .from("trips")
      .select("id, name, destination_name, destination_country, start_date, end_date, status, currency")
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(100);
    if (error) throw new ToolError("Could not load trips.");
    const trips = (data ?? []).map((t) => ({
      id: t.id, name: t.name, destination: t.destination_name, country: t.destination_country,
      start_date: t.start_date, end_date: t.end_date, status: t.status, currency: t.currency,
    }));
    const text = trips.length
      ? trips.map((t) => `${t.id}: ${t.name}${t.destination ? ` (${t.destination})` : ""} ${t.start_date ?? "?"} – ${t.end_date ?? "?"} [${t.status}]`).join("\n")
      : "No trips.";
    return { content: [{ type: "text", text }], structuredContent: { trips } };
  },
});
