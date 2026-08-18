import { supabase } from "@/integrations/supabase/client";

const JWT_LIKE = /\b[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g;
const BEARER = /Bearer\s+[^\s]+/gi;
const URL = /https?:\/\/[^\s]+/gi;

export function sanitizeClientErrorMessage(value: unknown) {
  const raw = value instanceof Error
    ? value.message
    : typeof value === "string"
      ? value
      : "Onbekende browserfout";

  return raw
    .replace(BEARER, "Bearer [redacted]")
    .replace(JWT_LIKE, "[token]")
    .replace(URL, "[url]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500);
}

export async function reportClientError(input: {
  area: string;
  error: unknown;
  tripId?: string | null;
  context?: Record<string, boolean | number | string | null>;
}) {
  const message = sanitizeClientErrorMessage(input.error);
  try {
    await supabase.rpc("record_client_error", {
      p_area: input.area.slice(0, 80),
      p_message: message,
      p_trip_id: input.tripId || null,
      p_context: input.context || {},
    });
  } catch {
    // Error telemetry must never trigger a second user-facing failure.
  }
}
