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

export type Database = Omit<Build06Database, "public"> & {
  public: Omit<Build06Database["public"], "Tables" | "Functions"> & {
    Tables: ExistingTables & {
      trip_documents: TripDocumentsTable;
    };
    Functions: ExistingFunctions & {
      reserve_trip_document: {
        Args: {
          p_trip_id: string;
          p_trip_item_id: string | null;
          p_filename: string;
          p_mime_type: string;
          p_document_type?: string;
        };
        Returns: Json;
      };
      finalize_trip_document: {
        Args: {
          p_document_id: string;
          p_size_bytes: number;
        };
        Returns: boolean;
      };
    };
  };
};
