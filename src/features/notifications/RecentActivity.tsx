import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { listTripActivity } from "./data";

export function RecentActivity({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const activityQuery = useQuery({
    queryKey: ["trip-activity", tripId],
    queryFn: () => listTripActivity(tripId),
    enabled: Boolean(tripId),
  });

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`trip-activity-${tripId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_events", filter: `trip_id=eq.${tripId}` },
        () => void queryClient.invalidateQueries({ queryKey: ["trip-activity", tripId] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, tripId]);

  if (activityQuery.isLoading) {
    return (
      <section className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recente activiteit</p>
        <div className="mt-3 h-28 animate-pulse rounded-2xl border border-border bg-card" />
      </section>
    );
  }

  if (activityQuery.isError || (activityQuery.data?.length || 0) === 0) return null;

  return (
    <section className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recente activiteit</p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {activityQuery.data?.slice(0, 5).map((event, index) => (
          <div key={event.id} className={`flex gap-3 px-4 py-3.5 ${index > 0 ? "border-t border-border/70" : ""}`}>
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/70" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{event.message}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: nl })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
