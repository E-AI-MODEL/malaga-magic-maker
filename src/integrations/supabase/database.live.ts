import type { Database as Build06Database } from "./database";
import type { Json } from "./types";

type ExistingTables = Build06Database["public"]["Tables"];
type ExistingFunctions = Build06Database["public"]["Functions"];

export type TripDocumentRow = {
  id: string;
  trip_id: string;
  trip_item_id: string | null;
  uploaded_by: string | null;
  filename: string;
  mime_type: string;
  document_type: string;
  storage_path: string;
  status: string;
  size_bytes: number | null;
  created_at: string;
  ready_at: string | null;
  extraction_status: string;
  extracted_text: string | null;
  extracted_summary: string | null;
  extracted_suggestion: Json | null;
  extracted_at: string | null;
};

type TripDocumentsTable = { Row: TripDocumentRow; Insert: never; Update: never; Relationships: [] };

export type AdminAuditRow = {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Json;
  created_at: string;
};

type AdminAuditTable = { Row: AdminAuditRow; Insert: never; Update: never; Relationships: [] };

export type ActivityEventRow = {
  id: string;
  trip_id: string;
  actor_user_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  metadata: Json;
  created_at: string;
};

type ActivityEventsTable = { Row: ActivityEventRow; Insert: never; Update: never; Relationships: [] };

export type NotificationRow = {
  id: string;
  user_id: string;
  from_user_id: string;
  task_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
  trip_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Json;
};

type NotificationsTable = {
  Row: NotificationRow;
  Insert: never;
  Update: { read?: boolean };
  Relationships: [];
};

export type NotificationPreferencesRow = {
  user_id: string;
  task_assignments: boolean;
  decisions: boolean;
  trip_updates: boolean;
  updated_at: string;
};

type NotificationPreferencesTable = {
  Row: NotificationPreferencesRow;
  Insert: {
    user_id: string;
    task_assignments?: boolean;
    decisions?: boolean;
    trip_updates?: boolean;
    updated_at?: string;
  };
  Update: {
    task_assignments?: boolean;
    decisions?: boolean;
    trip_updates?: boolean;
    updated_at?: string;
  };
  Relationships: [];
};

export type AiUsageEventRow = {
  id: string;
  user_id: string;
  trip_id: string;
  feature: "hansie";
  created_at: string;
};

type AiUsageEventsTable = { Row: AiUsageEventRow; Insert: never; Update: never; Relationships: [] };

export type ClientErrorEventRow = {
  id: string;
  user_id: string | null;
  trip_id: string | null;
  area: string;
  message: string;
  context: Json;
  created_at: string;
};

type ClientErrorEventsTable = { Row: ClientErrorEventRow; Insert: never; Update: never; Relationships: [] };

export type Database = Omit<Build06Database, "public"> & {
  public: Omit<Build06Database["public"], "Tables" | "Functions"> & {
    Tables: Omit<ExistingTables, "notifications"> & {
      trip_documents: TripDocumentsTable;
      admin_audit_log: AdminAuditTable;
      activity_events: ActivityEventsTable;
      notifications: NotificationsTable;
      notification_preferences: NotificationPreferencesTable;
      ai_usage_events: AiUsageEventsTable;
      client_error_events: ClientErrorEventsTable;
    };
    Functions: ExistingFunctions & {
      reserve_trip_document: {
        Args: { p_trip_id: string; p_trip_item_id: string | null; p_filename: string; p_mime_type: string; p_document_type?: string };
        Returns: Json;
      };
      finalize_trip_document: { Args: { p_document_id: string; p_size_bytes: number }; Returns: boolean };
      get_trip_readiness: { Args: { p_trip_id: string }; Returns: Json };
      ops_get_system_summary: { Args: Record<string, never>; Returns: Json };
      ops_search_users: { Args: { p_query?: string; p_limit?: number }; Returns: Json };
      ops_get_user_overview: { Args: { p_user_id: string }; Returns: Json };
      ops_search_trips: { Args: { p_query?: string; p_limit?: number }; Returns: Json };
      ops_get_trip_overview: { Args: { p_trip_id: string }; Returns: Json };
      ops_set_trip_status: { Args: { p_trip_id: string; p_status: string }; Returns: boolean };
      ops_revoke_trip_invite: { Args: { p_invite_id: string }; Returns: boolean };
      record_client_error: {
        Args: { p_area: string; p_message: string; p_trip_id?: string | null; p_context?: Json };
        Returns: boolean;
      };
    };
  };
};
