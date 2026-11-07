import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTrips from "./tools/list-trips";
import getTripPlan from "./tools/get-trip-plan";
import listExpenses from "./tools/list-expenses";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "vakansie",
  title: "Vakansie",
  version: "0.1.0",
  instructions:
    "Read-only access to the signed-in user's Vakansie trips. Start with list_trips, then use a trip id with get_trip_plan or list_expenses.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTrips, getTripPlan, listExpenses],
});
