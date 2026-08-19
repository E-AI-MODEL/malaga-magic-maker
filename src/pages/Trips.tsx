import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Archive, ChevronDown, ChevronRight, MapPin, Plus, Sparkles, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Trip, useTrip } from "@/contexts/TripContext";
import { tripTimingLabel } from "@/features/trips/presentation";
import { activeReadinessChecks, getTripReadiness, readinessAction } from "@/features/readiness/data";
import { NotificationCenter } from "@/components/NotificationCenter";
import { HansieWidget } from "@/components/HansieWidget";
import { Button } from "@/components/ui/button";
import { EmptyLine, ReadinessBar, RowItem, RowList, SectionLabel, StatusChip, Surface } from "@/components/primitives";
import { TripVisual } from "@/components/TripVisual";

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Data nog niet gekozen";

  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  return format(startDate || endDate || "");
}

function sortTrips(trips: Trip[]) {
  return [...trips].sort((a, b) => {
    if (!a.start_date && !b.start_date) return a.name.localeCompare(b.name);
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return a.start_date.localeCompare(b.start_date);
  });
}

/** The single dominant trip object on Mijn reizen: hero image plus one warm surface. */
function ActiveTripPanel({ trip }: { trip: Trip }) {
  const readinessQuery = useQuery({
    queryKey: ["trip-readiness", trip.id],
    queryFn: () => getTripReadiness(trip.id),
  });

  const readiness = readinessQuery.data;
  const attention = readiness ? activeReadinessChecks(readiness) : [];
  const attentionTotal = attention.reduce((total, check) => total + check.attention_count, 0);
  const trackedTotal = (readiness?.checks.length || 0) + attentionTotal;
  const done = Math.max(0, trackedTotal - attentionTotal);

  const sentence = readinessQuery.isLoading
    ? "Voorbereiding wordt opgehaald…"
    : !readiness
      ? "Status van de voorbereiding is nu niet beschikbaar."
      : readiness.status === "ready"
        ? "Alles wat in Vakansie staat, is geregeld."
        : `${done} van ${trackedTotal} geregeld · ${attentionTotal} ${attentionTotal === 1 ? "punt vraagt" : "punten vragen"} aandacht`;

  return (
    <section className="mt-5">
      <div className="relative">
        <TripVisual name={trip.name} coverImageUrl={trip.cover_image_url} height="h-[160px] sm:h-[200px]" />
        <Surface className="relative z-10 -mt-8 mx-3 px-4 pb-4 pt-4 sm:mx-5">
          <div className="flex items-center justify-between gap-3">
            <StatusChip tone={attentionTotal > 0 ? "attention" : "done"}>
              {tripTimingLabel(trip.start_date, trip.end_date)}
            </StatusChip>
            {attentionTotal > 0 && (
              <span className="font-ui text-[11px] font-semibold text-muted-foreground">
                {attentionTotal} {attentionTotal === 1 ? "punt" : "punten"}
              </span>
            )}
          </div>

          <Link
            to={`/trip/${trip.id}`}
            className="mt-3 block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <h2 className="truncate font-brand text-[26px] font-semibold leading-tight sm:text-3xl">{trip.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
              <span className="truncate">
                {trip.destination_name || "Bestemming nog niet gekozen"} · {formatDateRange(trip.start_date, trip.end_date)}
              </span>
            </p>
          </Link>

          <div className="mt-4">
            <ReadinessBar done={done} total={Math.max(1, trackedTotal)} sentence={sentence} />
          </div>

          <div className="mt-2 border-t border-rule/10">
            <RowList>
              <RowItem icon={ChevronRight} title="Reis openen" meta="Overzicht, reis en samen" to={`/trip/${trip.id}`} />
              <RowItem
                icon={Sparkles}
                title="Vraag het Hansie"
                meta="Over deze reis"
                onClick={() => {
                  document.querySelector<HTMLButtonElement>('[aria-label="Vraag het Hansie"]')?.click();
                }}
              />
            </RowList>
          </div>
        </Surface>
      </div>

      {attention.length > 0 && (
        <div className="mt-7">
          <SectionLabel>Dit vraagt aandacht</SectionLabel>
          <RowList className="mt-1">
            {attention.slice(0, 4).map((check) => {
              const action = readinessAction(check, trip.id);
              return (
                <RowItem
                  key={check.key}
                  icon={AlertCircle}
                  emphasis
                  tone="attention"
                  title={check.label}
                  meta={action?.label}
                  trailing={check.attention_count > 1 ? String(check.attention_count) : undefined}
                  to={action?.href}
                />
              );
            })}
          </RowList>
        </div>
      )}
    </section>
  );
}

/** Compact one-line row for every other trip. */
function TripRow({ trip, muted = false }: { trip: Trip; muted?: boolean }) {
  const timing = muted ? "Gearchiveerd" : tripTimingLabel(trip.start_date, trip.end_date);
  return (
    <Link to={`/trip/${trip.id}`} className="flex items-center gap-3 py-3.5 transition-opacity hover:opacity-70">
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${muted ? "bg-muted-foreground/40" : "bg-primary"}`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-tight">{trip.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {formatDateRange(trip.start_date, trip.end_date)} · {timing}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

export default function Trips() {
  const { profile } = useAuth();
  const { userTrips, loading } = useTrip();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { activeTrips, archivedTrips } = useMemo(() => ({
    activeTrips: sortTrips(userTrips.filter((trip) => trip.status !== "archived")),
    archivedTrips: sortTrips(userTrips.filter((trip) => trip.status === "archived")),
  }), [userTrips]);

  const [heroTrip, ...otherTrips] = activeTrips;

  return (
    <div className="min-h-screen bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-5">
          <p className="font-brand text-lg font-semibold">Vakansie</p>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
              <Link to="/profiel" aria-label="Profiel en voorkeuren">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
                  {profile?.display_name?.slice(0, 1).toUpperCase() || <User className="h-4 w-4" />}
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-ui text-[13px] font-semibold text-muted-foreground">
              {profile?.display_name ? `Hoi ${profile.display_name}` : "Welkom"}
            </p>
            <h1 className="mt-1 font-brand text-[28px] font-semibold leading-tight">Mijn reizen</h1>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-1 shrink-0 rounded-full">
            <Link to="/new-trip"><Plus className="mr-1.5 h-3.5 w-3.5" />Nieuwe reis</Link>
          </Button>
        </div>

        {loading ? (
          <div className="mt-5 h-32 animate-pulse rounded-[14px] bg-secondary" />
        ) : heroTrip ? (
          <ActiveTripPanel trip={heroTrip} />
        ) : (
          <EmptyLine
            text="Je hebt nog geen reis. Een naam is genoeg om te beginnen; data en boekingen kunnen later."
            actionLabel="Eerste reis starten"
            to="/new-trip"
          />
        )}

        {otherTrips.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Andere reizen</SectionLabel>
            <RowList className="mt-1">
              {otherTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)}
            </RowList>
          </section>
        )}

        {archivedTrips.length > 0 && (
          <section className="mt-8 border-t border-rule/10 pt-2">
            <button
              onClick={() => setArchiveOpen((current) => !current)}
              className="flex min-h-[48px] w-full items-center gap-2 py-3 text-left text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={archiveOpen}
            >
              <Archive className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="font-ui text-[13px] font-semibold">Archief ({archivedTrips.length})</span>
              <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${archiveOpen ? "rotate-180" : ""}`} />
            </button>
            {archiveOpen && (
              <RowList>{archivedTrips.map((trip) => <TripRow key={trip.id} trip={trip} muted />)}</RowList>
            )}
          </section>
        )}

      </main>

      <HansieWidget trip={heroTrip ? { id: heroTrip.id, name: heroTrip.name } : null} floating={false} />
    </div>
  );
}
