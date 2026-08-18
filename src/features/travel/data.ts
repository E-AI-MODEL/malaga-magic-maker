import { supabase } from "@/integrations/supabase/client";
import type { TripItemInsert, TripItemRow, TripItemUpdate } from "@/integrations/supabase/database";

export type { TripItemInsert, TripItemRow, TripItemUpdate };

export async function listTripItems(tripId: string) {
  const { data, error } = await supabase
    .from("trip_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("start_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createTripItem(input: TripItemInsert) {
  const { data, error } = await supabase
    .from("trip_items")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTripItem(tripId: string, itemId: string, input: TripItemUpdate) {
  const { data, error } = await supabase
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
  const { error } = await supabase
    .from("trip_items")
    .delete()
    .eq("trip_id", tripId)
    .eq("id", itemId);

  if (error) throw error;
}
