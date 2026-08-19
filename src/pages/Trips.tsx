import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  ChevronDown,
  ChevronRight,
  FileText,
  MapPin,
  Plus,
  Route,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Trip, useTrip } from "@/contexts/TripContext";
import { tripTimingLabel } from "@/features/trips/presentation";
import { activeReadinessChecks, getTripReadiness, readinessAction } from "@/features/readiness/data";
import { NotificationCenter } from "@/components/NotificationCenter";
import { HansieWidget } from "@/components/HansieWidget";
import { Button } from "@/components/ui/button";
import { EmptyLine, ReadinessBar, RowItem, RowList, SectionLabel, StatusChip, Surface } from "@/components/primitives";
import { TripThumb, TripVisual } from "@/components/TripVisual";
import heroHome from "@/assets/hero-home.jpg";

function openHansie() {
  document.querySelector<HTMLButtonElement>('[aria-label="Vraag het Hansie"]')?.click();
}

/** Editorial welcome hero. Only shown when there is no active trip to lead with. */
function WelcomeHero({ firstName }: { firstName?: string | null }) {
  return (
    <section className="mt-5">
      <div className="relative -mx-5 overflow-hidden sm:mx-0 sm:rounded-[18px]">
        <img
          src={heroHome}
          alt="Rustig terras met uitzicht op zee en een reisnotitieboek"
          width={1280}
          height={720}
          className="h-[210px] w-full object-cover sm:h-[260px]"
        />
        <div aria-hidden className="absolute inset-0 bg-foreground/45" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Vakansie
          </p>
          <h2 className="mt-1.5 font-brand text-[26px] font-semibold leading-tight text-white sm:text-[30px]">
            {firstName ? `${firstName}, waar gaat je volgende reis heen?` : "Waar gaat je volgende reis heen?"}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
            Zet je reis hier neer en bouw hem rustig op: vluchten en verblijf, wat er nog geregeld moet worden en
            wie wat doet. Alles op één plek, ook als er nog weinig vaststaat.
          </p>
        </div>
      </div>

      <Button asChild size="lg" className="mt-4 w-full rounded-full sm:w-auto">
        <Link to="/new-trip">
          <Plus className="mr-1.5 h-4 w-4" />
          Reis starten
        </Link>
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Een naam is genoeg om te beginnen. Data, bestemming en boekingen kun je later invullen.
      </p>
    </section>
  );
}

/** Plain explanation of the product, in the same row language as the rest of the app. */
function HowItWorks() {
  return (
    <section className="mt-8">
      <SectionLabel>Zo werkt het</SectionLabel>
      <Surface className="mt-2 px-4 shadow-none">
        <RowList>
          <RowItem
            icon={Route}
            emphasis
            title="Reis"
            meta="Vluchten, verblijf, vervoer en activiteiten op één tijdlijn"
          />
          <RowItem
            icon={Users}
            emphasis
            title="Samen"
            meta="Taken verdelen, keuzes maken en kosten bijhouden met je reisgenoten"
          />
          <RowItem
            icon={FileText}
            emphasis
            title="Documenten"
            meta="Tickets, bevestigingen en vouchers veilig bij de reis bewaard"
          />
          <RowItem
            icon={Sparkles}
            emphasis
            title="Hansie"
            meta="Stel vragen over je voorbereiding; Hansie kijkt alleen mee in de geopende reis"
          />
        </RowList>
      </Surface>
    </section>
  );
}

/** Concrete next steps for the trip you are leading with. */
function TripSuggestions({ trip }: { trip: Trip }) {
  return (
    <section className="mt-8">
      <SectionLabel>Suggesties</SectionLabel>
      <Surface className="mt-2 px-4 shadow-none">
        <RowList>
          <RowItem
            icon={Route}
            title="Reisplan aanvullen"
            meta="Voeg je heenreis, verblijf en eerste dag toe"
            to={`/trip/${trip.id}/reis`}
          />
          <RowItem
            icon={Users}
            title="Reisgenoten uitnodigen"
            meta="Deel de voorbereiding en verdeel taken"
            to={`/trip/${trip.id}/samen`}
          />
          <RowItem
            icon={FileText}
            title="Documenten bewaren"
            meta="Tickets en bevestigingen op één plek"
            to={`/trip/${trip.id}/reis`}
          />
          <RowItem
            icon={Sparkles}
            title="Vraag Hansie wat er nog mist"
            meta="Hansie gebruikt alleen deze reis als context"
            onClick={openHansie}
          />
        </RowList>
      </Surface>
    </section>
  );
}

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
      <div className="relative -mx-5 sm:mx-0">
        <TripVisual
          name={trip.name}
          coverImageUrl={trip.cover_image_url}
          height="h-[176px] sm:h-[220px]"
          rounded="rounded-none sm:rounded-[18px]"
        />

        <Surface className="relative z-10 -mt-8 mx-4 px-4 pb-4 pt-4 sm:mx-5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <StatusChip tone={attentionTotal > 0 ? "attention" : "done"}>
              {tripTimingLabel(trip.start_date, trip.end_date)}
            </StatusChip>
            {attentionTotal > 0 && (
              <span className="font-ui text-[11px] font-semibold text-warning">
                {attentionTotal} {attentionTotal === 1 ? "punt" : "punten"} aandacht
              </span>
            )}
          </div>

          <Link
            to={`/trip/${trip.id}`}
            className="mt-3 block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <h2 className="truncate font-brand text-[27px] font-semibold leading-tight sm:text-3xl">{trip.name}</h2>
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
                title="Vraag Hansie over deze reis"
                meta="Hansie gebruikt alleen deze reis als context"
                onClick={openHansie}
              />
            </RowList>
          </div>
        </Surface>
      </div>

      {attention.length > 0 && (
        <div className="mt-7">
          <SectionLabel>Dit vraagt aandacht</SectionLabel>
          <Surface className="mt-2 px-4 shadow-none">
            <RowList>
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
          </Surface>
        </div>
      )}
    </section>
  );
}

function TripRow({ trip, muted = false }: { trip: Trip; muted?: boolean }) {
  const timing = muted ? "Gearchiveerd" : tripTimingLabel(trip.start_date, trip.end_date);
  return (
    <Link to={`/trip/${trip.id}`} className="flex items-center gap-3 py-3 transition-opacity hover:opacity-70">
      <TripThumb name={trip.name} coverImageUrl={trip.cover_image_url} className={muted ? "opacity-60" : ""} />
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
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-5">
          <p className="font-brand text-xl font-semibold text-primary">Vakansie</p>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
              <Link to="/profiel" aria-label="Profiel en voorkeuren">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground shadow-soft">
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
            <h1 className="mt-1 font-brand text-[30px] font-semibold leading-tight">Mijn reizen</h1>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-1 shrink-0 rounded-full bg-card shadow-soft">
            <Link to="/new-trip"><Plus className="mr-1.5 h-3.5 w-3.5" />Nieuwe reis</Link>
          </Button>
        </div>

        {loading ? (
          <div className="mt-5 h-40 animate-pulse rounded-[18px] bg-secondary" />
        ) : heroTrip ? (
          <>
            <ActiveTripPanel trip={heroTrip} />
            <TripSuggestions trip={heroTrip} />
          </>
        ) : (
          <>
            <WelcomeHero firstName={profile?.display_name?.split(" ")[0]} />
            <HowItWorks />
          </>
        )}

        {otherTrips.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Andere reizen</SectionLabel>
            <Surface className="mt-2 px-4 shadow-none">
              <RowList>
                {otherTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)}
              </RowList>
            </Surface>
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
              <Surface className="px-4 shadow-none">
                <RowList>{archivedTrips.map((trip) => <TripRow key={trip.id} trip={trip} muted />)}</RowList>
              </Surface>
            )}
          </section>
        )}
      </main>

      <HansieWidget trip={heroTrip ? { id: heroTrip.id, name: heroTrip.name } : null} floating={false} />
    </div>
  );
}
