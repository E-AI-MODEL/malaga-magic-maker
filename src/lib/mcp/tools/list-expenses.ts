import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_expenses",
  title: "List expenses",
  description: "List the shared costs recorded for a trip. Use an id from list_trips.",
  inputSchema: { trip_id: z.string().uuid().describe("Trip id from list_trips.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ trip_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const db = supabaseForUser(ctx);
    const { data, error } = await db
      .from("expenses")
      .select("id, description, amount, currency, paid_by, created_at")
      .eq("trip_id", trip_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new ToolError("Could not load expenses.");
    const expenses = (data ?? []).map((e) => ({
      id: e.id, description: e.description, amount: Number(e.amount), currency: e.currency, paid_by: e.paid_by, created_at: e.created_at,
    }));
    const text = expenses.length
      ? expenses.map((e) => `${e.created_at.slice(0, 10)} ${e.description}: ${e.amount.toFixed(2)} ${e.currency}${e.paid_by ? ` (paid by ${e.paid_by})` : ""}`).join("\n")
      : "No expenses for this trip.";
    return { content: [{ type: "text", text }], structuredContent: { expenses } };
  },
});
