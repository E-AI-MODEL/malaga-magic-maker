import type { Database as GeneratedDatabase, Json } from "./types";

/**
 * Exact schema overlay for database changes that are already live but cannot yet
 * be regenerated through the connected Supabase Management API.
 *
 * Keep this file small and temporary. When the canonical generator becomes
 * available, regenerate `types.ts`, remove the corresponding overlay here and
 * keep the exported Database API unchanged for the rest of the app.
 */
export type TripItemRow = {
  address: string | null;
  booking_reference: string | null;
  booking_url: string | null;
  created_at: string;
  created_by: string | null;
  currency: string | null;
  end_at: string | null;
  id: string;
  latitude: number | null;
  location_name: string | null;
  longitude: number | null;
  metadata: Json;
  notes: string | null;
  price: number | null;
  provider: string | null;
  start_at: string | null;
  status: string;
  timezone: string | null;
  title: string;
  trip_id: string;
  type: string;
  updated_at: string;
};

export type TripItemInsert = {
  address?: string | null;
  booking_reference?: string | null;
  booking_url?: string | null;
  created_at?: string;
  created_by?: string | null;
  currency?: string | null;
  end_at?: string | null;
  id?: string;
  latitude?: number | null;
  location_name?: string | null;
  longitude?: number | null;
  metadata?: Json;
  notes?: string | null;
  price?: number | null;
  provider?: string | null;
  start_at?: string | null;
  status?: string;
  timezone?: string | null;
  title: string;
  trip_id: string;
  type: string;
  updated_at?: string;
};

export type TripItemUpdate = Partial<Omit<TripItemInsert, "trip_id">>;

type TripItemsTable = {
  Row: TripItemRow;
  Insert: TripItemInsert;
  Update: TripItemUpdate;
  Relationships: [
    {
      foreignKeyName: "trip_items_trip_id_fkey";
      columns: ["trip_id"];
      isOneToOne: false;
      referencedRelation: "trip";
      referencedColumns: ["id"];
    },
  ];
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables"> & {
    Tables: GeneratedDatabase["public"]["Tables"] & {
      trip_items: TripItemsTable;
    };
  };
};
