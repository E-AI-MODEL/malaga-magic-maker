import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_trip_plan",
  title: "Get trip plan",
  description: "Show a trip's itinerary items, open tasks and choices. Use an id from list_trips.",
  inputSchema: { trip_id: z.string().uuid().describe("Trip id from list_trips.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ trip_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const db = supabaseForUser(ctx);
    const trip = await db.from("trips").select("id, name").eq("id", trip_id).maybeSingle();
    if (trip.error || !trip.data) throw new ToolError("Trip not found or not accessible.");
    const [items, tasks, decisions] = await Promise.all([
      db.from("trip_items").select("id, item_type, title, start_at, end_at, location_name").eq("trip_id", trip_id).order("start_at", { ascending: true }).limit(200),
      db.from("tasks").select("id, title, status, due_at").eq("trip_id", trip_id).limit(200),
      db.from("decisions").select("id, title, status, closes_at").eq("trip_id", trip_id).limit(100),
    ]);
    if (items.error || tasks.error || decisions.error) throw new ToolError("Could not load trip plan.");
    const plan = {
      trip: { id: trip.data.id, name: trip.data.name },
      items: (items.data ?? []).map((i) => ({ id: i.id, type: i.item_type, title: i.title, start_at: i.start_at, end_at: i.end_at, location: i.location_name })),
      tasks: (tasks.data ?? []).map((t) => ({ id: t.id, title: t.title, status: t.status, due_at: t.due_at })),
      decisions: (decisions.data ?? []).map((d) => ({ id: d.id, title: d.title, status: d.status, closes_at: d.closes_at })),
    };
    const text = [
      `Trip: ${plan.trip.name}`,
      `Items (${plan.items.length}):`, ...plan.items.map((i) => `- ${i.start_at ?? "?"} ${i.type}: ${i.title}`),
      `Tasks (${plan.tasks.length}):`, ...plan.tasks.map((t) => `- [${t.status}] ${t.title}`),
      `Choices (${plan.decisions.length}):`, ...plan.decisions.map((d) => `- [${d.status}] ${d.title}`),
    ].join("\n");
    return { content: [{ type: "text", text }], structuredContent: plan };
  },
});
