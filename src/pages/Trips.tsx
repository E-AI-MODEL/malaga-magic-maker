import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Archive, ArrowRight, CheckSquare, ChevronDown, ChevronRight, Plus, Receipt, Scale } from "lucide-react";
import { Trip, useTrip } from "@/contexts/TripContext";
import { tripTimingLabel } from "@/features/trips/presentation";
import { getTripReadiness } from "@/features/readiness/data";
import { getHomeFacts, emptyHomeFacts, personalFollowUps, type HomeFacts } from "@/features/trips/home-data";
import { tripPreparation } from "@/features/trips/preparation";
import { tripHasEnded } from "@/features/trips/overview";
import { listTripItems } from "@/features/travel/data";
import { useAuth } from "@/lib/auth";
import { usePlanStatus } from "@/features/pro/limits";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ReadinessBar, RowItem, RowList, SectionLabel } from "@/components/primitives";
import { TripThumb, TripVisual } from "@/components/TripVisual";
import { GettingStarted } from "@/features/onboarding/GettingStarted";
import heroHome from "@/assets/hero-home.jpg";

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
function NextTrip({ trip, facts, userId }: { trip: Trip; facts: HomeFacts; userId?: string }) {
  const readinessQuery = useQuery({
    queryKey: ["trip-readiness", trip.id],
    queryFn: () => getTripReadiness(trip.id),
  });

  const itemsQuery = useQuery({ queryKey: ["trip-items", trip.id], queryFn: () => listTripItems(trip.id) });
  const ended = tripHasEnded(trip, trip.timezone || "Europe/Amsterdam");
  const preparation = tripPreparation({ activeTrip: trip, items: itemsQuery.data || [], tasks: facts.tasks.filter((task) => task.trip_id === trip.id), decisions: facts.decisions.filter((decision) => decision.trip_id === trip.id), readiness: readinessQuery.data, userId, ended });
  const first = preparation.things[0];

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
          <span className="block truncate font-brand text-[22px] font-bold leading-tight">{trip.name}</span>
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

      {ended ? <p className="mt-3 text-xs text-muted-foreground">Deze reis is afgelopen.</p> : readinessQuery.data && itemsQuery.data ? (
        <div className="mt-3 space-y-3">
          <ReadinessBar done={preparation.done} total={preparation.total} />
          {first && <Link to={first.href} className="block text-sm text-muted-foreground hover:text-foreground">{first.title}</Link>}
        </div>
      ) : <p className="mt-3 text-xs text-muted-foreground">Voorbereiding laden…</p>}
      <Button asChild variant="outline" size="sm" className="mt-4"><Link to={`/trip/${trip.id}`}>Naar reis<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
    </section>
  );
}

function TripRow({ trip }: { trip: Trip }) {
  return (
    <Link to={`/trip/${trip.id}`} className="row-tap flex items-center gap-3 py-3 transition-opacity hover:opacity-70">
      <TripThumb name={trip.name} coverImageUrl={trip.cover_image_url} className="opacity-60" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-tight">{trip.name}</span>
        <span className="num mt-0.5 block truncate text-xs text-muted-foreground">
          {formatDateRange(trip.start_date, trip.end_date)}
        </span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

export default function Trips() {
  const { userTrips, loading } = useTrip();
  const { user, profile } = useAuth();
  const { status: plan } = usePlanStatus();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { activeTrips, archivedTrips } = useMemo(() => ({
    activeTrips: sortTrips(userTrips.filter((trip) => trip.status !== "archived")),
    archivedTrips: sortTrips(userTrips.filter((trip) => trip.status === "archived")),
  }), [userTrips]);

  const nextTrips = activeTrips.filter((trip) => !tripHasEnded(trip, trip.timezone || "Europe/Amsterdam"));
  const heroTrip = nextTrips[0];
  const otherTrips = activeTrips.filter((trip) => trip.id !== heroTrip?.id);
  const tripIds = activeTrips.map((trip) => trip.id);
  const factsQuery = useQuery({ queryKey: ["home-facts", user?.id, tripIds], queryFn: () => getHomeFacts(tripIds), enabled: Boolean(user && !loading), staleTime: 0 });
  const facts = factsQuery.data || emptyHomeFacts;
  const personal = user ? personalFollowUps(activeTrips, facts, user.id) : [];
  const firstName = profile?.display_name.trim().split(/\s+/)[0];

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 break-words font-display text-[30px] font-bold leading-tight">{firstName ? `Hoi ${firstName}` : "Hoi"}</h1>
          <Button asChild variant="outline" size="sm" className="shrink-0 rounded-md bg-card">
            <Link to="/new-trip"><Plus className="mr-1.5 h-3.5 w-3.5" />Nieuwe reis</Link>
          </Button>
        </div>

        {loading ? (
          <div className="mt-5 h-20 animate-pulse rounded-[14px] bg-secondary" />
        ) : heroTrip ? (
          <>
            <SectionLabel className="mt-6">Eerstvolgende reis</SectionLabel>
            <NextTrip trip={heroTrip} facts={facts} userId={user?.id} />
            <GettingStarted trip={heroTrip} hasAnyTrip={userTrips.length > 0} />
          </>
        ) : activeTrips.length ? <GettingStarted trip={activeTrips[0]} hasAnyTrip={userTrips.length > 0} /> : (
          <div className="mt-6">
            <div className="relative h-[340px] w-full overflow-hidden rounded-[20px]">
              <img src={heroHome} alt="Terras met uitzicht op zee en een opengeslagen reisnotitieboek" width={1280} height={720} loading="eager" className="h-full w-full object-cover" />
              <div aria-hidden className="absolute inset-0 bg-foreground/60" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h2 className="font-display text-[30px] font-bold uppercase leading-[1.08] tracking-wide text-white">
                  Je hele vakantie
                  <br />
                  in je broekzak
                </h2>
                <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/90">
                  Begin met een naam. Data, mensen en plannen voeg je toe wanneer je wilt.
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="mt-4 w-full rounded-md sm:w-auto">
              <Link to="/new-trip"><Plus className="mr-1.5 h-4 w-4" />Je eerste reis starten</Link>
            </Button>
            <GettingStarted trip={null} hasAnyTrip={userTrips.length > 0} />
          </div>
        )}

        {!loading && <section className="mt-7 border-t border-rule pt-1">
          <SectionLabel>Voor jou</SectionLabel>
          {factsQuery.isPending ? <p className="py-3 text-sm text-muted-foreground">Laden…</p> : factsQuery.isError ? <p className="py-3 text-sm text-muted-foreground">Je overzicht is nu niet beschikbaar. <Button variant="link" onClick={() => void factsQuery.refetch()}>Opnieuw proberen</Button></p> : personal.length ? <RowList>
            {personal.map((item) => <RowItem key={item.key} icon={item.kind === "task" ? CheckSquare : item.kind === "decision" ? Scale : Receipt} title={item.title} meta={item.tripName} to={item.href} />)}
          </RowList> : <p className="py-3 text-sm text-muted-foreground">Niets dat op jou wacht.</p>}
        </section>}

        {otherTrips.length > 0 && (
          <section className="mt-8 border-t border-rule pt-1">
            <SectionLabel>Andere reizen</SectionLabel>
            <RowList className="mt-0.5">
              {otherTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)}
            </RowList>
          </section>
        )}
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-rule py-4 text-sm text-muted-foreground">
          <span>{plan ? plan.plan === "free" ? `Gratis · ${plan.tripLimit ?? 1} reis · ${plan.hansieDayLimit} Hansie-vragen per dag` : "Pro" : "Account laden…"}</span>
          <Button asChild variant="link" className="h-auto p-0"><Link to="/profiel">Profiel</Link></Button>
        </footer>

        {archivedTrips.length > 0 && (
          <section className="mt-6 border-t border-rule">
            <Button
              variant="ghost"
              onClick={() => setArchiveOpen((current) => !current)}
              className="row-tap flex w-full items-center gap-2 py-3 text-left text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={archiveOpen}
            >
              <Archive className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="font-ui text-[13px] font-semibold">Archief</span>
              <span className="num text-[13px]">{archivedTrips.length}</span>
              <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${archiveOpen ? "rotate-180" : ""}`} />
            </Button>
            {archiveOpen && (
              <RowList className="border-t border-rule">
                {archivedTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)}
              </RowList>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
