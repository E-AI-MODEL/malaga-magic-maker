import { supabase } from "@/integrations/supabase/client";
import type { ClientErrorEventRow } from "@/integrations/supabase/database.live";

export async function listRecentClientErrors(): Promise<ClientErrorEventRow[]> {
  const { data, error } = await supabase
    .from("client_error_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}
