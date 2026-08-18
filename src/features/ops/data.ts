import { supabase } from "@/integrations/supabase/client";
import type { AdminAuditRow } from "@/integrations/supabase/database.live";

type JsonRecord = Record<string, unknown>;

export type OpsSummary = {
  users: number;
  trips: number;
  active_trips: number;
  archived_trips: number;
  trip_items: number;
  open_tasks: number;
  ready_documents: number;
  active_invites: number;
  hansie_requests_24h?: number;
  client_errors_24h?: number;
};

export type OpsUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  roles: string[];
  trip_count: number;
  created_at: string;
  last_sign_in_at: string | null;
};

export type OpsTrip = {
  id: string;
  name: string;
  destination_name: string | null;
  destination_country: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_by: string | null;
  creator_name: string | null;
  member_count: number;
  item_count: number;
  open_task_count: number;
  document_count: number;
};

export type OpsMembership = {
  trip_id: string;
  trip_name: string;
  destination_name: string | null;
  trip_status: string;
  role: string;
  joined_at: string;
};

export type OpsUserOverview = OpsUser & { memberships: OpsMembership[] };

export type OpsTripMember = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  joined_at: string;
};

export type OpsTripOverview = OpsTrip & {
  created_at: string;
  open_decision_count: number;
  active_invite_count: number;
  members: OpsTripMember[];
};

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid ops response");
  return value as JsonRecord;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value || 0);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseUser(value: unknown): OpsUser {
  const item = record(value);
  if (typeof item.id !== "string") throw new Error("Invalid user result");
  return {
    id: item.id,
    email: stringOrNull(item.email),
    display_name: stringOrNull(item.display_name),
    username: stringOrNull(item.username),
    roles: stringArray(item.roles),
    trip_count: numberValue(item.trip_count),
    created_at: typeof item.created_at === "string" ? item.created_at : "",
    last_sign_in_at: stringOrNull(item.last_sign_in_at),
  };
}

function parseTrip(value: unknown): OpsTrip {
  const item = record(value);
  if (typeof item.id !== "string" || typeof item.name !== "string") throw new Error("Invalid trip result");
  return {
    id: item.id,
    name: item.name,
    destination_name: stringOrNull(item.destination_name),
    destination_country: stringOrNull(item.destination_country),
    start_date: stringOrNull(item.start_date),
    end_date: stringOrNull(item.end_date),
    status: typeof item.status === "string" ? item.status : "planning",
    created_by: stringOrNull(item.created_by),
    creator_name: stringOrNull(item.creator_name),
    member_count: numberValue(item.member_count),
    item_count: numberValue(item.item_count),
    open_task_count: numberValue(item.open_task_count),
    document_count: numberValue(item.document_count),
  };
}

async function rpcJson(name: "ops_get_system_summary" | "ops_search_users" | "ops_get_user_overview" | "ops_search_trips" | "ops_get_trip_overview", args: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc(name, args as never);
  if (error) throw error;
  return data;
}

export async function getOpsSummary(): Promise<OpsSummary> {
  const item = record(await rpcJson("ops_get_system_summary"));
  return {
    users: numberValue(item.users),
    trips: numberValue(item.trips),
    active_trips: numberValue(item.active_trips),
    archived_trips: numberValue(item.archived_trips),
    trip_items: numberValue(item.trip_items),
    open_tasks: numberValue(item.open_tasks),
    ready_documents: numberValue(item.ready_documents),
    active_invites: numberValue(item.active_invites),
    hansie_requests_24h: item.hansie_requests_24h == null ? undefined : numberValue(item.hansie_requests_24h),
    client_errors_24h: item.client_errors_24h == null ? undefined : numberValue(item.client_errors_24h),
  };
}

export async function searchOpsUsers(query: string): Promise<OpsUser[]> {
  const value = await rpcJson("ops_search_users", { p_query: query, p_limit: 50 });
  return Array.isArray(value) ? value.map(parseUser) : [];
}

export async function getOpsUserOverview(userId: string): Promise<OpsUserOverview> {
  const item = record(await rpcJson("ops_get_user_overview", { p_user_id: userId }));
  const base = parseUser({ ...item, trip_count: Array.isArray(item.memberships) ? item.memberships.length : 0 });
  const memberships = Array.isArray(item.memberships)
    ? item.memberships.map((value) => {
        const membership = record(value);
        return {
          trip_id: String(membership.trip_id || ""),
          trip_name: String(membership.trip_name || "Reis"),
          destination_name: stringOrNull(membership.destination_name),
          trip_status: String(membership.trip_status || "planning"),
          role: String(membership.role || "member"),
          joined_at: String(membership.joined_at || ""),
        };
      })
    : [];
  return { ...base, memberships };
}

export async function searchOpsTrips(query: string): Promise<OpsTrip[]> {
  const value = await rpcJson("ops_search_trips", { p_query: query, p_limit: 75 });
  return Array.isArray(value) ? value.map(parseTrip) : [];
}

export async function getOpsTripOverview(tripId: string): Promise<OpsTripOverview> {
  const item = record(await rpcJson("ops_get_trip_overview", { p_trip_id: tripId }));
  const base = parseTrip({ ...item, creator_name: item.creator_name ?? null });
  const members = Array.isArray(item.members)
    ? item.members.map((value) => {
        const member = record(value);
        return {
          user_id: String(member.user_id || ""),
          display_name: stringOrNull(member.display_name),
          email: stringOrNull(member.email),
          role: String(member.role || "member"),
          joined_at: String(member.joined_at || ""),
        };
      })
    : [];
  return {
    ...base,
    created_at: typeof item.created_at === "string" ? item.created_at : "",
    open_decision_count: numberValue(item.open_decision_count),
    active_invite_count: numberValue(item.active_invite_count),
    members,
  };
}

export async function setOpsTripStatus(tripId: string, status: string) {
  const { error } = await supabase.rpc("ops_set_trip_status", { p_trip_id: tripId, p_status: status });
  if (error) throw error;
}

export async function listOpsAudit(): Promise<AdminAuditRow[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data || [];
}
