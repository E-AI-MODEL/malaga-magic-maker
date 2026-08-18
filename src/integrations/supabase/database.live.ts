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
};

type TripDocumentsTable = {
  Row: TripDocumentRow;
  Insert: never;
  Update: never;
  Relationships: [
    {
      foreignKeyName: "trip_documents_trip_id_fkey";
      columns: ["trip_id"];
      isOneToOne: false;
      referencedRelation: "trip";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "trip_documents_trip_item_id_fkey";
      columns: ["trip_item_id"];
      isOneToOne: false;
      referencedRelation: "trip_items";
      referencedColumns: ["id"];
    },
  ];
};

export type AdminAuditRow = {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Json;
  created_at: string;
};

type AdminAuditTable = {
  Row: AdminAuditRow;
  Insert: never;
  Update: never;
  Relationships: [];
};

export type Database = Omit<Build06Database, "public"> & {
  public: Omit<Build06Database["public"], "Tables" | "Functions"> & {
    Tables: ExistingTables & {
      trip_documents: TripDocumentsTable;
      admin_audit_log: AdminAuditTable;
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
    };
  };
};
