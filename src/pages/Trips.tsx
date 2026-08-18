import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Archive, ChevronDown, ChevronRight, LogOut, MapPin, Plus, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Trip, useTrip } from "@/contexts/TripContext";
import { tripTimingLabel } from "@/features/trips/presentation";
import { activeReadinessChecks, getTripReadiness, readinessAction } from "@/features/readiness/data";
import { NotificationCenter } from "@/components/NotificationCenter";
import { HansieWidget } from "@/components/HansieWidget";
import { Button } from "@/components/ui/button";
import { EmptyLine, ReadinessBar, RowItem, RowList, SectionLabel } from "@/components/primitives";

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

/** Cover for the dominant trip. Uses only a real stored cover image. */
function TripCover({ trip }: { trip: Trip }) {
  if (trip.cover_image_url) {
    return (
      <img
        src={trip.cover_image_url}
        alt={`Omslagfoto van ${trip.name}`}
        loading="lazy"
        className="h-36 w-full rounded-xl object-cover sm:h-44"
      />
    );
  }
  return (
    <div className="flex h-20 w-full items-center gap-2 rounded-xl bg-secondary px-4 text-muted-foreground sm:h-24">
      <MapPin className="h-4 w-4 shrink-0" />
      <span className="truncate text-sm">{trip.destination_name || "Bestemming nog niet gekozen"}</span>
    </div>
  );
}

/** The single dominant trip object on Mijn reizen. */
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
      <TripCover trip={trip} />
      <Link to={`/trip/${trip.id}`} className="group mt-4 block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {tripTimingLabel(trip.start_date, trip.end_date)}
        </p>
        <h2 className="mt-1.5 truncate font-brand text-[27px] font-semibold leading-tight sm:text-3xl">{trip.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDateRange(trip.start_date, trip.end_date)}
          {trip.destination_name ? ` · ${trip.destination_name}` : ""}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Reis openen<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      <div className="mt-4">
        <ReadinessBar done={done} total={Math.max(1, trackedTotal)} sentence={sentence} />
      </div>

      {attention.length > 0 && (
        <div className="mt-7">
          <SectionLabel>Nu belangrijk</SectionLabel>
          <RowList className="mt-1">
            {attention.slice(0, 4).map((check) => {
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
  const { profile, signOut } = useAuth();
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
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Link to="/profiel" aria-label="Profiel en voorkeuren">
                <User className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void signOut()}
              aria-label="Uitloggen"
              className="h-8 w-8 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {profile?.display_name ? `Hoi ${profile.display_name}` : "Welkom"}
            </p>
            <h1 className="mt-1.5 font-brand text-[28px] font-semibold leading-tight">Mijn reizen</h1>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-1 shrink-0 rounded-full">
            <Link to="/new-trip"><Plus className="mr-1.5 h-3.5 w-3.5" />Nieuwe reis</Link>
          </Button>
        </div>

        {loading ? (
          <div className="mt-5 h-40 animate-pulse rounded-2xl bg-secondary" />
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
          <section className="mt-8 border-t border-rule pt-2">
            <button
              onClick={() => setArchiveOpen((current) => !current)}
              className="flex w-full items-center gap-2 py-3 text-left text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={archiveOpen}
            >
              <Archive className="h-[18px] w-[18px]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Archief ({archivedTrips.length})</span>
              <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${archiveOpen ? "rotate-180" : ""}`} />
            </button>
            {archiveOpen && (
              <RowList>{archivedTrips.map((trip) => <TripRow key={trip.id} trip={trip} muted />)}</RowList>
            )}
          </section>
        )}

      </main>

      <HansieWidget trip={heroTrip ? { id: heroTrip.id, name: heroTrip.name } : null} />
    </div>
  );
}
