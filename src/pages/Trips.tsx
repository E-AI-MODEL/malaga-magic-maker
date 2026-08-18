import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Archive, ArrowRight, CalendarDays, LogOut, MapPin, Plane, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Trip, useTrip } from "@/contexts/TripContext";
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

  return (
    <Link
      to={`/trip/${trip.id}`}
      className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${archived ? "text-muted-foreground" : "text-primary"}`}>
            {archived ? "Gearchiveerd" : "Reis"}
          </p>
          <h2 className="mt-2 truncate font-display text-xl font-extrabold">{trip.name}</h2>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-primary/10">
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </div>

      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{trip.destination_name || "Bestemming nog niet ingevuld"}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Trips() {
  const { profile, signOut } = useAuth();
  const { userTrips, loading } = useTrip();

  const { activeTrips, archivedTrips } = useMemo(() => ({
    activeTrips: sortTrips(userTrips.filter((trip) => trip.status !== "archived")),
    archivedTrips: sortTrips(userTrips.filter((trip) => trip.status === "archived")),
  }), [userTrips]);

  const hasTrips = activeTrips.length + archivedTrips.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div>
            <p className="font-display text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Vakansie</p>
            <p className="mt-1 text-xs text-muted-foreground">Alles voor vertrek bij elkaar</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{profile?.display_name}</span>
            <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Uitloggen">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Overzicht</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Mijn reizen</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Open een reis om te zien wat vaststaat, wat nog geregeld moet worden en wat je samen doet.
            </p>
          </div>
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/new-trip"><Plus className="mr-2 h-4 w-4" />Nieuwe reis</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-border bg-card" />)}
          </div>
        ) : !hasTrips ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-6 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Plane className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-display text-xl font-extrabold">Je hebt nog geen reis</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Begin met een naam. Bestemming, data en de rest kun je daarna rustig aanvullen.
            </p>
            <Button asChild className="mt-6">
              <Link to="/new-trip"><Plus className="mr-2 h-4 w-4" />Nieuwe reis</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-extrabold">Actieve reizen</h2>
                <span className="text-xs text-muted-foreground">{activeTrips.length}</span>
              </div>
              {activeTrips.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">{activeTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}</div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Geen actieve reizen.</div>
              )}
            </section>

            {archivedTrips.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-display text-lg font-extrabold">Archief</h2>
                  <span className="ml-auto text-xs text-muted-foreground">{archivedTrips.length}</span>
                </div>
                <div className="grid gap-4 opacity-80 sm:grid-cols-2">{archivedTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}</div>
              </section>
            )}
          </div>
        )}

        {hasTrips && (
          <Button asChild className="mt-6 w-full sm:hidden">
            <Link to="/new-trip"><Plus className="mr-2 h-4 w-4" />Nieuwe reis</Link>
          </Button>
        )}
      </main>
    </div>
  );
}
