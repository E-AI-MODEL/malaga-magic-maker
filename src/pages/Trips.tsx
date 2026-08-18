import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ChevronDown, ChevronRight, LogOut, Plus, Sparkles, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Trip, useTrip } from "@/contexts/TripContext";
import { tripTimingLabel } from "@/features/trips/presentation";
import { Button } from "@/components/ui/button";
import { EmptyLine, RowList, SectionLabel } from "@/components/primitives";

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

/** Full-bleed hero for the trip that is next up. */
function TripHero({ trip }: { trip: Trip }) {
  const timing = tripTimingLabel(trip.start_date, trip.end_date);
  return (
    <Link to={`/trip/${trip.id}`} className="group block overflow-hidden rounded-2xl bg-foreground text-background">
      <div className="px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{timing}</p>
        <h2 className="mt-2 truncate font-display text-[26px] font-extrabold leading-tight tracking-tight sm:text-3xl">{trip.name}</h2>
        <p className="mt-1.5 text-sm text-white/55">
          {formatDateRange(trip.start_date, trip.end_date)}
          {trip.destination_name ? ` · ${trip.destination_name}` : ""}
        </p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-background">
          Reis openen<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-foreground text-background">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-5">
          <p className="font-display text-xs font-extrabold uppercase tracking-[0.18em]">Vakansie</p>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white">
              <Link to="/profiel" aria-label="Profiel en voorkeuren">
                <User className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void signOut()}
              aria-label="Uitloggen"
              className="h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {profile?.display_name ? `Hoi ${profile.display_name}` : "Welkom"}
        </p>
        <h1 className="mt-1.5 font-display text-[28px] font-extrabold leading-tight tracking-tight">Mijn reizen</h1>

        {loading ? (
          <div className="mt-5 h-40 animate-pulse rounded-2xl bg-secondary" />
        ) : heroTrip ? (
          <div className="mt-5">
            <TripHero trip={heroTrip} />
          </div>
        ) : (
          <EmptyLine
            text="Je hebt nog geen reis. Een naam is genoeg om te beginnen; data en boekingen kunnen later."
            actionLabel="Eerste reis starten"
            to="/new-trip"
          />
        )}

        {heroTrip && (
          <section className="mt-8">
            <SectionLabel>Hansie</SectionLabel>
            <RowList className="mt-1">
              <Link to={`/trip/${heroTrip.id}`} className="flex items-center gap-3 py-3.5 transition-opacity hover:opacity-70">
                <Sparkles className="h-[18px] w-[18px] shrink-0 text-primary" />
                <span className="min-w-0 flex-1 text-[15px] font-medium">Vraag Hansie wat er nog moet gebeuren</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              </Link>
            </RowList>
          </section>
        )}

        {otherTrips.length > 0 && (
          <section className="mt-8">
            <SectionLabel
              action={
                <Link to="/new-trip" className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
                  Nieuwe reis
                </Link>
              }
            >
              Andere reizen
            </SectionLabel>
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

        {activeTrips.length > 0 && otherTrips.length === 0 && (
          <Button asChild className="mt-8 h-11 w-full rounded-full">
            <Link to="/new-trip"><Plus className="mr-2 h-4 w-4" />Nieuwe reis</Link>
          </Button>
        )}
      </main>
    </div>
  );
}
