import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ListTodo, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { supabase } from "@/integrations/supabase/client";

interface MemberProfile {
  id: string;
  display_name: string;
}

export default function TripSamen() {
  const { activeTrip, tripMembers } = useTrip();
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [tasks, setTasks] = useState<Array<{ status: string | null; progress: number | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTrip) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const memberIds = tripMembers.map((member) => member.user_id);
      const [profilesResult, tasksResult] = await Promise.all([
        memberIds.length > 0
          ? supabase.from("profiles").select("id, display_name").in("id", memberIds)
          : Promise.resolve({ data: [] as MemberProfile[] }),
        supabase.from("tasks").select("status, progress").eq("trip_id", activeTrip.id),
      ]);

      if (cancelled) return;
      setProfiles((profilesResult.data as MemberProfile[]) || []);
      setTasks((tasksResult.data as Array<{ status: string | null; progress: number | null }>) || []);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTrip?.id, tripMembers]);

  const taskStats = useMemo(() => {
    const complete = tasks.filter((task) => {
      const status = String(task.status || "").toLowerCase();
      return status === "done" || status === "completed" || Number(task.progress || 0) >= 100;
    }).length;
    return { complete, open: Math.max(0, tasks.length - complete) };
  }, [tasks]);

  if (!activeTrip) return null;

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile.display_name]));

  return (
    <AppLayout>
      <div className="px-5 py-7 sm:px-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Samen</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Regel wat je samen doet</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Medereizigers, taken, gezamenlijke keuzes en kosten horen bij deze reis, niet bij de app als geheel.
        </p>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-extrabold">Medereizigers</h2>
              <p className="text-xs text-muted-foreground">Wie toegang heeft tot deze reis.</p>
            </div>
          </div>

          <div className="mt-5 divide-y divide-border">
            {tripMembers.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nog geen medereizigers gevonden.</p>
            ) : (
              tripMembers.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{profileMap.get(member.user_id) || "Reiziger"}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.role === "organizer" ? "Organisator" : "Deelnemer"}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {member.role === "organizer" ? "Organisator" : "Lid"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListTodo className="h-4 w-4 text-primary" />Nog regelen
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold">{loading ? "…" : taskStats.open}</p>
            <p className="mt-1 text-xs text-muted-foreground">open {taskStats.open === 1 ? "taak" : "taken"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-primary" />Afgerond
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold">{loading ? "…" : taskStats.complete}</p>
            <p className="mt-1 text-xs text-muted-foreground">afgeronde {taskStats.complete === 1 ? "taak" : "taken"}</p>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-dashed border-border px-5 py-6">
          <p className="font-display font-extrabold">Alles wat je deelt, krijgt hier zijn plek</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Gezamenlijke keuzes en kosten worden in deze omgeving toegevoegd zonder bestemming- of groepsspecifieke aannames.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
