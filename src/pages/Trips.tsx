import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Gauge,
  MapPin,
  Plane,
  Plus,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Trip, useTrip } from "@/contexts/TripContext";
import { tripTimingLabel } from "@/features/trips/presentation";
import { Button } from "@/components/ui/button";

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

function TripRow({ trip }: { trip: Trip }) {
  const archived = trip.status === "archived";
  const timing = archived ? "Gearchiveerd" : tripTimingLabel(trip.start_date, trip.end_date);

  return (
    <Link
      to={`/trip/${trip.id}`}
      className="group grid gap-4 border-b border-border/70 px-1 py-5 transition-colors last:border-b-0 hover:bg-secondary/35 sm:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)_auto] sm:items-center sm:px-4"
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${archived ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
          {archived ? <Archive className="h-5 w-5" /> : <Plane className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-lg font-extrabold tracking-tight">{trip.name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${archived ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
              {timing}
            </span>
          </div>
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{trip.destination_name || "Bestemming nog niet ingevuld"}</span>
          </p>
        </div>
      </div>

      <div className="ml-[58px] flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:ml-0">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />{formatDateRange(trip.start_date, trip.end_date)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />{trip.group_size || 1} {trip.group_size === 1 ? "reiziger" : "reizigers"}
        </span>
      </div>

      <div className="hidden h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all group-hover:bg-foreground group-hover:text-background sm:flex">
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

export default function Trips() {
  const { profile, isAdmin } = useAuth();
  const { userTrips, loading } = useTrip();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { activeTrips, archivedTrips } = useMemo(() => ({
    activeTrips: sortTrips(userTrips.filter((trip) => trip.status !== "archived")),
    archivedTrips: sortTrips(userTrips.filter((trip) => trip.status === "archived")),
  }), [userTrips]);

  const showArchive = archiveOpen || activeTrips.length === 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/trips" className="group">
            <p className="font-display text-base font-extrabold tracking-tight">Vakansie</p>
            <p className="text-[11px] text-muted-foreground">Alles voor vertrek bij elkaar</p>
          </Link>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button asChild variant="ghost" size="sm" className="hidden gap-2 sm:inline-flex">
                <Link to="/ops"><Gauge className="h-4 w-4" />Beheer</Link>
              </Button>
            )}
            {isAdmin && (
              <Button asChild variant="ghost" size="icon" className="sm:hidden">
                <Link to="/ops" aria-label="Beheer"><Gauge className="h-4 w-4" /></Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon">
              <Link to="/profiel" aria-label="Profiel en voorkeuren"><User className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
        <section className="flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
              {profile?.display_name ? `Hoi ${profile.display_name}` : "Welkom"}
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Mijn reizen</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Open een reis om te zien wat vaststaat, wat nog aandacht vraagt en wat jullie samen regelen.
            </p>
          </div>
          <Button asChild className="h-11 shrink-0 rounded-xl sm:w-auto">
            <Link to="/new-trip"><Plus className="mr-2 h-4 w-4" />Nieuwe reis</Link>
          </Button>
        </section>

        {loading ? (
          <div className="mt-6 divide-y divide-border/70">
            {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse bg-secondary/25" />)}
          </div>
        ) : (
          <>
            {activeTrips.length === 0 ? (
              <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-secondary/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-extrabold">Geen actieve reis</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Een naam is genoeg om te beginnen. De rest vul je aan zodra het bekend is.</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
                  <Link to="/new-trip">Reis starten</Link>
                </Button>
              </section>
            ) : (
              <section className="mt-7">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.11em] text-muted-foreground">Komend</h2>
                  <span className="text-xs text-muted-foreground">{activeTrips.length}</span>
                </div>
                <div className="border-y border-border/70">{activeTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)}</div>
              </section>
            )}

            {archivedTrips.length > 0 && (
              <section className="mt-8">
                <button
                  type="button"
                  onClick={() => setArchiveOpen((current) => !current)}
                  className="flex w-full items-center gap-2 px-1 py-2 text-left text-muted-foreground transition-colors hover:text-foreground"
                  aria-expanded={showArchive}
                >
                  <Archive className="h-4 w-4" />
                  <span className="font-display text-sm font-extrabold uppercase tracking-[0.11em]">Eerdere reizen</span>
                  <span className="ml-auto text-xs">{archivedTrips.length}</span>
                </button>
                {showArchive && (
                  <div className="mt-1 border-y border-border/70 opacity-85">{archivedTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)}</div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
