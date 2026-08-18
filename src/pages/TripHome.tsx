import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, ListTodo, MapPin, Route, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { activeReadinessChecks, getTripReadiness, readinessAction, readinessHeadline } from "@/features/readiness/data";
import { tripTimingLabel } from "@/features/trips/presentation";
import { listTripItems } from "@/features/travel/data";
import { formatTripDateTime, getTravelType } from "@/features/travel/presentation";
import { RecentActivity } from "@/features/notifications/RecentActivity";

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
  const primaryAttention = attention[0];
  const primaryAction = primaryAttention ? readinessAction(primaryAttention, activeTrip.id) : null;
  const timing = tripTimingLabel(activeTrip.start_date, activeTrip.end_date);
  const now = Date.now();
  const nextItem = (itemsQuery.data || [])
    .filter((item) => item.start_at && new Date(item.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime())[0];

  return (
    <AppLayout>
      <div className="px-5 py-7 sm:px-8 sm:py-10">
        <section className="overflow-hidden rounded-3xl bg-foreground text-background">
          <div className="px-6 py-7 sm:px-8 sm:py-9">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{timing}</span>
              {activeTrip.destination_country && <span className="text-xs text-white/40">{activeTrip.destination_country}</span>}
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{activeTrip.name}</h1>
            <div className="mt-5 grid gap-2 text-sm text-white/65 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>{formatDateRange(activeTrip.start_date, activeTrip.end_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{activeTrip.destination_name || "Bestemming nog niet ingevuld"}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Voor vertrek</p>
          <div className="mt-3 rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Hoe staat je voorbereiding ervoor?</p>
                <p className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">
                  {readinessQuery.isLoading ? "Even kijken…" : readiness ? readinessHeadline(readiness) : "Status niet beschikbaar"}
                </p>
                {readiness?.status === "ready" && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Op basis van wat nu in Vakansie staat, zijn er geen open aandachtspunten.</p>
                )}
              </div>
            </div>

            {primaryAttention && primaryAction && (
              <div className="mt-5 rounded-2xl bg-secondary/60 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Eerst regelen</p>
                  <p className="mt-1 font-semibold">{primaryAttention.label}</p>
                  {primaryAttention.attention_count > 1 && <p className="mt-1 text-xs text-muted-foreground">{primaryAttention.attention_count} punten vragen aandacht</p>}
                </div>
                <Link
                  to={primaryAction.href}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:mt-0"
                >
                  {primaryAction.label}<ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}

            {attention.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {attention.slice(1).map((check) => (
                  <span key={check.key} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
                    {check.label}{check.attention_count > 1 ? ` · ${check.attention_count}` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link to={`/trip/${activeTrip.id}/reis`} className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
            <p className="text-sm text-muted-foreground">Eerstvolgende</p>
            {itemsQuery.isLoading ? (
              <p className="mt-1 font-display text-2xl font-extrabold">…</p>
            ) : nextItem ? (
              <>
                <p className="mt-1 font-display text-lg font-extrabold">{getTravelType(nextItem.type).icon} {nextItem.title}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatTripDateTime(nextItem.start_at, nextItem.timezone || timezone)}</p>
              </>
            ) : (
              <>
                <p className="mt-1 font-semibold">Nog niets op je tijdlijn</p>
                <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">Naar Reis <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></p>
              </>
            )}
          </Link>

          <Link to={`/trip/${activeTrip.id}/samen`} className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
            <p className="text-sm text-muted-foreground">Samen op reis</p>
            <p className="mt-1 font-display text-2xl font-extrabold">
              {readinessQuery.isLoading ? "…" : `${readiness?.facts.member_count || 0} ${readiness?.facts.member_count === 1 ? "persoon" : "personen"}`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Taken, keuzes en kosten met je medereizigers.</p>
          </Link>
        </section>

        <RecentActivity tripId={activeTrip.id} />

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
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Je route, boekingen, documenten en reisonderdelen.</p>
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
