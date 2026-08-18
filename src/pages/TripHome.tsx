import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ListTodo, MapPin, Route, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { supabase } from "@/integrations/supabase/client";

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Data nog niet gekozen";
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  return format(startDate || endDate || "");
}

export default function TripHome() {
  const { activeTrip } = useTrip();
  const [memberCount, setMemberCount] = useState(0);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTrip) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [membersResult, tasksResult] = await Promise.all([
        supabase
          .from("trip_members")
          .select("id", { count: "exact", head: true })
          .eq("trip_id", activeTrip.id),
        supabase
          .from("tasks")
          .select("status, progress")
          .eq("trip_id", activeTrip.id),
      ]);

      if (cancelled) return;

      setMemberCount(membersResult.count || 0);
      const open = (tasksResult.data || []).filter((task) => {
        const status = String(task.status || "").toLowerCase();
        return status !== "done" && status !== "completed" && Number(task.progress || 0) < 100;
      }).length;
      setOpenTaskCount(open);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTrip?.id]);

  if (!activeTrip) return null;

  return (
    <AppLayout>
      <div className="px-5 py-7 sm:px-8 sm:py-10">
        <section className="rounded-3xl bg-foreground px-6 py-7 text-background sm:px-8 sm:py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Je reis</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{activeTrip.name}</h1>
          <div className="mt-5 space-y-2 text-sm text-white/65">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>{formatDateRange(activeTrip.start_date, activeTrip.end_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{activeTrip.destination_name || "Bestemming nog niet ingevuld"}</span>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nu belangrijk</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Nog regelen</p>
              <p className="mt-1 font-display text-2xl font-extrabold">
                {loading ? "…" : openTaskCount === 0 ? "Geen open taken" : `${openTaskCount} open ${openTaskCount === 1 ? "taak" : "taken"}`}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Medereizigers</p>
              <p className="mt-1 font-display text-2xl font-extrabold">
                {loading ? "…" : `${memberCount} ${memberCount === 1 ? "persoon" : "personen"}`}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            to={`/trip/${activeTrip.id}/reis`}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Route className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-extrabold">Reis</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Je route, boekingen en reisonderdelen op één plek.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            to={`/trip/${activeTrip.id}/samen`}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-extrabold">Samen</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Mensen, taken, keuzes en kosten rond deze reis.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      </div>
    </AppLayout>
  );
}
