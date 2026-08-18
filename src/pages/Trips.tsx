import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ArrowRight, CalendarDays, LogOut, MapPin, Plane, Plus, User, Users } from "lucide-react";
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

function TripCard({ trip }: { trip: Trip }) {
  const archived = trip.status === "archived";
  const timing = archived ? "Gearchiveerd" : tripTimingLabel(trip.start_date, trip.end_date);

  return (
    <Link
      to={`/trip/${trip.id}`}
      className="group flex min-h-56 flex-col rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${archived ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
          {timing}
        </span>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-5 min-w-0">
        <h2 className="truncate font-display text-xl font-extrabold sm:text-2xl">{trip.name}</h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{trip.destination_name || "Bestemming nog kiezen"}</span>
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-7 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />{formatDateRange(trip.start_date, trip.end_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />{trip.group_size || 1} {trip.group_size === 1 ? "reiziger" : "reizigers"}
        </span>
      </div>
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="font-display text-sm font-extrabold tracking-tight">Vakansie</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Alles voor vertrek bij elkaar</p>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon">
              <Link to="/profiel" aria-label="Profiel en voorkeuren">
                <User className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Uitloggen">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
        <div className="mb-9 flex items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{profile?.display_name ? `Hoi ${profile.display_name}` : "Welkom"}</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Mijn reizen</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Bewaar wat vaststaat, zie wat nog aandacht nodig heeft en regel de rest samen op één plek.
            </p>
          </div>
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/new-trip"><Plus className="mr-2 h-4 w-4" />Nieuwe reis</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((item) => <div key={item} className="h-56 animate-pulse rounded-3xl border border-border bg-card" />)}
          </div>
        ) : activeTrips.length === 0 ? (
          <section className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="px-6 py-9 text-center sm:px-10 sm:py-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Plane className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold">Waar wil je naartoe?</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Maak een reis aan zodra er iets begint te spelen. Een naam is genoeg; data, boekingen en plannen kunnen later volgen.
              </p>
              <Button asChild className="mt-6 h-11">
                <Link to="/new-trip"><Plus className="mr-2 h-4 w-4" />Eerste reis starten</Link>
              </Button>
            </div>
            <div className="grid border-t border-border bg-secondary/35 sm:grid-cols-3">
              <div className="px-5 py-4 text-center text-xs text-muted-foreground sm:border-r sm:border-border">Reisgegevens en documenten</div>
              <div className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground sm:border-r sm:border-t-0">Taken en keuzes samen regelen</div>
              <div className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground sm:border-t-0">Hansie helpt je zien wat nog mist</div>
            </div>
          </section>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold">Komende reizen</h2>
              <span className="text-xs text-muted-foreground">{activeTrips.length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">{activeTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}</div>
          </section>
        )}

        {archivedTrips.length > 0 && (
          <section className="mt-10">
            <button
              onClick={() => setArchiveOpen((current) => !current)}
              className="flex w-full items-center gap-2 rounded-xl px-1 py-2 text-left text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={archiveOpen}
            >
              <Archive className="h-4 w-4" />
              <span className="font-display text-sm font-extrabold">Archief</span>
              <span className="ml-auto text-xs">{archivedTrips.length}</span>
            </button>
            {archiveOpen && (
              <div className="mt-3 grid gap-4 opacity-80 sm:grid-cols-2">{archivedTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}</div>
            )}
          </section>
        )}

        {activeTrips.length > 0 && (
          <Button asChild className="mt-7 w-full sm:hidden">
            <Link to="/new-trip"><Plus className="mr-2 h-4 w-4" />Nieuwe reis</Link>
          </Button>
        )}
      </main>
    </div>
  );
}
