import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/** Server-side plan limits, mirrored here for copy only. Enforcement lives in the database. */
export const FREE_LIMITS = {
  trips: 1,
  hansiePerDay: 12,
  documentsPerTrip: 5,
} as const;

export const PRO_LIMITS = {
  hansiePerDay: 150,
  documentsPerTrip: 200,
} as const;

const LIMIT_MESSAGES: Record<string, string> = {
  trip_limit_reached: `Zonder Pro kun je één actieve reis hebben. Archiveer je huidige reis of activeer Pro voor onbeperkt reizen.`,
  document_limit_reached: `Deze reis zit op de gratis grens van ${FREE_LIMITS.documentsPerTrip} documenten. Met Pro kun je er ${PRO_LIMITS.documentsPerTrip} per reis bewaren.`,
  hansie_limit_reached: `Je hebt je Hansie-vragen voor vandaag gebruikt. Met Pro krijg je er ${PRO_LIMITS.hansiePerDay} per dag.`,
};

/** Turns a raw backend error into customer-facing copy, or null when it is not a plan limit. */
export function describePlanLimit(error: unknown): string | null {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const key = Object.keys(LIMIT_MESSAGES).find((k) => raw.includes(k));
  return key ? LIMIT_MESSAGES[key] : null;
}

export interface PlanStatus {
  plan: "free" | "pro";
  proEnvironment: "sandbox" | "live" | null;
  tripsOwned: number;
  tripLimit: number | null;
  canCreateTrip: boolean;
  hansieUsedToday: number;
  hansieDayLimit: number;
  documentLimitPerTrip: number;
}

export function usePlanStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setStatus(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_my_plan_status");
    if (error || !data || typeof data !== "object") {
      setStatus(null);
      setLoading(false);
      return;
    }
    const row = data as Record<string, unknown>;
    setStatus({
      plan: row.plan === "pro" ? "pro" : "free",
      proEnvironment: row.pro_environment === "sandbox" || row.pro_environment === "live" ? row.pro_environment : null,
      tripsOwned: Number(row.trips_owned ?? 0),
      tripLimit: row.trip_limit === null || row.trip_limit === undefined ? null : Number(row.trip_limit),
      canCreateTrip: row.can_create_trip !== false,
      hansieUsedToday: Number(row.hansie_used_today ?? 0),
      hansieDayLimit: Number(row.hansie_day_limit ?? FREE_LIMITS.hansiePerDay),
      documentLimitPerTrip: Number(row.document_limit_per_trip ?? FREE_LIMITS.documentsPerTrip),
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, loading, refresh: load };
}
