import { supabase } from "@/integrations/supabase/client";

type ReadinessCheck = {
  key: "dates" | "destination" | "tasks" | "decisions" | "bookings";
  attention_count: number;
};

export type TripReadiness = {
  status: "ready" | "attention";
  attention_count: number;
  checks: ReadinessCheck[];
  facts: {
    trip_item_count: number;
    document_count: number;
    member_count: number;
  };
};

const checkLabels: Record<ReadinessCheck["key"], string> = {
  dates: "Reisdata ontbreken",
  destination: "Bestemming ontbreekt",
  tasks: "Open taken",
  decisions: "Open keuzes",
  bookings: "Boekingen nog niet bevestigd",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseTripReadiness(value: unknown): TripReadiness {
  if (!isRecord(value) || !Array.isArray(value.checks) || !isRecord(value.facts)) {
    throw new Error("Invalid readiness response");
  }

  const checks = value.checks.map((check) => {
    if (!isRecord(check) || typeof check.key !== "string" || typeof check.attention_count !== "number") {
      throw new Error("Invalid readiness check");
    }
    if (!(check.key in checkLabels)) throw new Error("Unknown readiness check");
    return { key: check.key as ReadinessCheck["key"], attention_count: check.attention_count };
  });

  const facts = value.facts;
  if (
    typeof facts.trip_item_count !== "number" ||
    typeof facts.document_count !== "number" ||
    typeof facts.member_count !== "number"
  ) {
    throw new Error("Invalid readiness facts");
  }

  return {
    status: value.status === "ready" ? "ready" : "attention",
    attention_count: typeof value.attention_count === "number" ? value.attention_count : 0,
    checks,
    facts: {
      trip_item_count: facts.trip_item_count,
      document_count: facts.document_count,
      member_count: facts.member_count,
    },
  };
}

export async function getTripReadiness(tripId: string) {
  const { data, error } = await supabase.rpc("get_trip_readiness", { p_trip_id: tripId });
  if (error) throw error;
  return parseTripReadiness(data);
}

export function readinessHeadline(readiness: TripReadiness) {
  if (readiness.status === "ready") return "Klaar voor vertrek";
  const count = readiness.attention_count;
  return `${count} ${count === 1 ? "ding" : "dingen"} regelen`;
}

export function activeReadinessChecks(readiness: TripReadiness) {
  return readiness.checks
    .filter((check) => check.attention_count > 0)
    .map((check) => ({ ...check, label: checkLabels[check.key] }));
}
