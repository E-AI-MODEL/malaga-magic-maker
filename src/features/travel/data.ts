import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

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

type TravelDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      trip_items: TripItemsTable;
    };
  };
};

// Temporary type bridge for BUILD 04. It points to the same runtime client and
// exact applied schema. Replace this bridge once the canonical generated
// Supabase types are regenerated from the connected project.
const travelSupabase = supabase as unknown as SupabaseClient<TravelDatabase>;

export type LegacyTravelItem = {
  id: string;
  date: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  note: string | null;
};

export async function listTripItems(tripId: string) {
  const { data, error } = await travelSupabase
    .from("trip_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("start_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createTripItem(input: TripItemInsert) {
  const { data, error } = await travelSupabase
    .from("trip_items")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTripItem(tripId: string, itemId: string, input: TripItemUpdate) {
  const { data, error } = await travelSupabase
    .from("trip_items")
    .update(input)
    .eq("trip_id", tripId)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTripItem(tripId: string, itemId: string) {
  const { error } = await travelSupabase
    .from("trip_items")
    .delete()
    .eq("trip_id", tripId)
    .eq("id", itemId);

  if (error) throw error;
}

export async function listLegacyTravelItems(tripId: string): Promise<LegacyTravelItem[]> {
  const { data, error } = await supabase
    .from("travel_legs")
    .select("id, travel_date, departure_time, arrival_time, note, sort_order")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    date: row.travel_date,
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    note: row.note,
  }));
}
