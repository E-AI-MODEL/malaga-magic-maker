import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTrip } from "@/contexts/TripContext";

export interface POI {
  id: string;
  category_id: string;
  name: string;
  emoji: string | null;
  url: string | null;
  description: string | null;
  travel_times: Record<string, number>;
  sort_order: number;
}

export interface POICategory {
  id: string;
  trip_id: string | null;
  key: string;
  label: string;
  emoji: string;
  color_threshold_good: number;
  color_threshold_ok: number;
  sort_order: number;
  pois: POI[];
}

export function usePOIData() {
  const { activeTrip } = useTrip();
  const [categories, setCategories] = useState<POICategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [catRes, poiRes] = await Promise.all([
      supabase.from("poi_categories").select("*").order("sort_order"),
      supabase.from("pois").select("*").order("sort_order"),
    ]);

    const cats = (catRes.data || []) as any[];
    const pois = (poiRes.data || []) as any[];

    const merged: POICategory[] = cats.map((cat) => ({
      id: cat.id,
      trip_id: cat.trip_id,
      key: cat.key,
      label: cat.label,
      emoji: cat.emoji,
      color_threshold_good: cat.color_threshold_good,
      color_threshold_ok: cat.color_threshold_ok,
      sort_order: cat.sort_order,
      pois: pois
        .filter((p) => p.category_id === cat.id)
        .map((p) => ({
          id: p.id,
          category_id: p.category_id,
          name: p.name,
          emoji: p.emoji,
          url: p.url,
          description: p.description,
          travel_times: (p.travel_times || {}) as Record<string, number>,
          sort_order: p.sort_order,
        })),
    }));

    setCategories(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { categories, loading, refetch: fetchData };
}
