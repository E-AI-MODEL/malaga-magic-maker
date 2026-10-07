import { HansiePanel } from "@/features/hansie/HansiePanel";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Archive, ChevronDown, ChevronRight, Plus, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Trip, useTrip } from "@/contexts/TripContext";
import { tripTimingLabel } from "@/features/trips/presentation";
import { activeReadinessChecks, getTripReadiness, readinessAction } from "@/features/readiness/data";
import { NotificationCenter } from "@/components/NotificationCenter";
import { HansieWidget } from "@/components/HansieWidget";
import { Button } from "@/components/ui/button";
import { ReadinessBar, RowItem, RowList, SectionLabel } from "@/components/primitives";
import { TripThumb, TripVisual } from "@/components/TripVisual";
import logo from "@/assets/vakansie_primary_complete.png.asset.json";

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Data nog te kiezen";

  const format = (value: string, withYear: boolean) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    });

  if (startDate && endDate) {
    const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
    return `${format(startDate, !sameYear)} – ${format(endDate, true)}`;
  }
  return format(startDate || endDate || "", true);
}

function sortTrips(trips: Trip[]) {
  return [...trips].sort((a, b) => {
    if (!a.start_date && !b.start_date) return a.name.localeCompare(b.name);
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return a.start_date.localeCompare(b.start_date);
  });
}

/**
 * The next trip is the only place on this screen that earns extra surface: a wide
 * row with a small photo, the dates, the countdown and the preparation line.
 * Everything else stays a plain list row.
 */
function NextTrip({ trip }: { trip: Trip }) {
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
    ? "Voorbereiding laden…"
    : !readiness
      ? "Voorbereiding niet beschikbaar"
      : readiness.status === "ready"
        ? "Alles geregeld"
        : `${done} van ${trackedTotal} geregeld`;

  return (
    <section className="mt-5 border-y border-border bg-card px-4 py-4">
      <Link to={`/trip/${trip.id}`} className="flex items-center gap-3.5 py-1">
        <TripVisual
          name={trip.name}
          coverImageUrl={trip.cover_image_url}
          height="h-[72px]"
          rounded="rounded-lg"
          showBadge={false}
          className="w-[72px] shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display uppercase tracking-tight text-[22px] font-extrabold leading-tight">{trip.name}</span>
          <span className="num mt-1 block truncate text-[13px] text-muted-foreground">
            {formatDateRange(trip.start_date, trip.end_date)}
            {trip.destination_name ? ` · ${trip.destination_name}` : ""}
          </span>
          <span className="mt-0.5 block truncate font-ui text-[12px] font-semibold text-primary">
            {tripTimingLabel(trip.start_date, trip.end_date)}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </Link>

      <div className="mt-3.5">
        <ReadinessBar done={done} total={Math.max(1, trackedTotal)} sentence={sentence} />
      </div>

      {attention.length > 0 && (
        <div className="mt-3 border-t border-rule">
          <SectionLabel>Dit vraagt aandacht</SectionLabel>
          <RowList className="mt-0.5">
            {attention.slice(0, 3).map((check) => {
              const action = readinessAction(check, trip.id);
              return (
                <RowItem
                  key={check.key}
                  icon={AlertCircle}
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

function TripRow({ trip, muted = false }: { trip: Trip; muted?: boolean }) {
  const timing = muted ? "Gearchiveerd" : tripTimingLabel(trip.start_date, trip.end_date);
  return (
    <Link to={`/trip/${trip.id}`} className="row-tap flex items-center gap-3 py-3 transition-opacity hover:opacity-70">
      <TripThumb name={trip.name} coverImageUrl={trip.cover_image_url} className={muted ? "opacity-60" : ""} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-tight">{trip.name}</span>
        <span className="num mt-0.5 block truncate text-xs text-muted-foreground">
          {formatDateRange(trip.start_date, trip.end_date)}
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{timing}</span>
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
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-5">
          <img src={logo.url} alt="Vakansie" width={169} height={43} className="h-8 w-auto object-contain" />
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
              <Link to="/profiel" aria-label="Profiel en voorkeuren">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground">
                  {profile?.display_name?.slice(0, 1).toUpperCase() || <User className="h-4 w-4" />}
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display uppercase text-[30px] font-bold leading-tight">Mijn reizen</h1>
          <Button asChild variant="outline" size="sm" className="shrink-0 rounded-md bg-card">
            <Link to="/new-trip"><Plus className="mr-1.5 h-3.5 w-3.5" />Nieuwe reis</Link>
          </Button>
        </div>

        {loading ? (
          <div className="mt-5 h-20 animate-pulse rounded-[14px] bg-secondary" />
        ) : heroTrip ? (
          <>
            <NextTrip trip={heroTrip} />
            <HansiePanel page="trips" tripId={heroTrip.id} title={`Vraag Hansie over ${heroTrip.name}`} className="mt-5" />
          </>
        ) : (
          <div className="mt-8 border-t border-rule pt-6">
            <p className="font-display uppercase tracking-tight text-[22px] font-extrabold leading-snug">Nog geen reis</p>
            <p className="mt-1.5 text-sm text-muted-foreground">Een naam is genoeg om te beginnen.</p>
            <Button asChild size="lg" className="mt-4 rounded-md">
              <Link to="/new-trip"><Plus className="mr-1.5 h-4 w-4" />Reis starten</Link>
            </Button>
          </div>
        )}

        {otherTrips.length > 0 && (
          <section className="mt-8 border-t border-rule pt-1">
            <SectionLabel>Andere reizen</SectionLabel>
            <RowList className="mt-0.5">
              {otherTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)}
            </RowList>
          </section>
        )}

        {archivedTrips.length > 0 && (
          <section className="mt-6 border-t border-rule">
            <button
              onClick={() => setArchiveOpen((current) => !current)}
              className="row-tap flex w-full items-center gap-2 py-3 text-left text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={archiveOpen}
            >
              <Archive className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="font-ui text-[13px] font-semibold">Archief</span>
              <span className="num text-[13px]">{archivedTrips.length}</span>
              <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${archiveOpen ? "rotate-180" : ""}`} />
            </button>
            {archiveOpen && (
              <RowList className="border-t border-rule">
                {archivedTrips.map((trip) => <TripRow key={trip.id} trip={trip} muted />)}
              </RowList>
            )}
          </section>
        )}
      </main>

      <HansieWidget trip={heroTrip ? { id: heroTrip.id, name: heroTrip.name, start_date: heroTrip.start_date, end_date: heroTrip.end_date } : null} floating={false} />
    </div>
  );
}
