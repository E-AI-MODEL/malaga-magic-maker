import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, ListTodo, MapPin, Route, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { activeReadinessChecks, getTripReadiness, readinessHeadline } from "@/features/readiness/data";
import { listTripItems } from "@/features/travel/data";
import { formatTripDateTime, getTravelType } from "@/features/travel/presentation";

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
  const tripId = activeTrip?.id || "";
  const timezone = activeTrip?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam";

  const readinessQuery = useQuery({
    queryKey: ["trip-readiness", tripId],
    queryFn: () => getTripReadiness(tripId),
    enabled: Boolean(tripId),
  });

  const itemsQuery = useQuery({
    queryKey: ["trip-items", tripId],
    queryFn: () => listTripItems(tripId),
    enabled: Boolean(tripId),
  });

  if (!activeTrip) return null;

  const readiness = readinessQuery.data;
  const attention = readiness ? activeReadinessChecks(readiness) : [];
  const now = Date.now();
  const nextItem = (itemsQuery.data || [])
    .filter((item) => item.start_at && new Date(item.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime())[0];

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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Voor vertrek</p>
          <div className="mt-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Hoe staat je voorbereiding ervoor?</p>
                <p className="mt-1 font-display text-2xl font-extrabold">
                  {readinessQuery.isLoading ? "Even kijken…" : readiness ? readinessHeadline(readiness) : "Status niet beschikbaar"}
                </p>
                {readiness?.status === "ready" && (
                  <p className="mt-2 text-sm text-muted-foreground">Op basis van wat nu in Vakansie staat, zijn er geen open aandachtspunten.</p>
                )}
                {attention.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attention.map((check) => (
                      <div key={check.key} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/55 px-3 py-2.5 text-sm">
                        <span>{check.label}</span>
                        <span className="shrink-0 font-semibold text-primary">{check.attention_count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Medereizigers</p>
            <p className="mt-1 font-display text-2xl font-extrabold">
              {readinessQuery.isLoading ? "…" : `${readiness?.facts.member_count || 0} ${readiness?.facts.member_count === 1 ? "persoon" : "personen"}`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{readiness?.facts.document_count || 0} documenten · {readiness?.facts.trip_item_count || 0} reisonderdelen</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Eerstvolgende</p>
            {itemsQuery.isLoading ? (
              <p className="mt-1 font-display text-2xl font-extrabold">…</p>
            ) : nextItem ? (
              <>
                <p className="mt-1 font-display text-lg font-extrabold">{getTravelType(nextItem.type).icon} {nextItem.title}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatTripDateTime(nextItem.start_at, nextItem.timezone || timezone)}</p>
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold">Nog niets gepland</p>
            )}
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
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Je route, boekingen, documenten en reisonderdelen op één plek.</p>
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
