import { useEffect, useState } from "react";
import { Check, ExternalLink, Link2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  accommodationSources,
  addCandidateAsStay,
  candidateFacts,
  createAccommodationDecision,
  lookupAccommodationUrl,
  searchAccommodations,
  type AccommodationCandidate,
  type AccommodationSource,
} from "@/features/travel/accommodation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  groupSize: number | null;
  onSaved: () => void | Promise<void>;
};

/** Search accommodations across booking sites, or read one pasted listing link. */
export function AccommodationSearchSheet({
  open,
  onOpenChange,
  tripId,
  destination,
  startDate,
  endDate,
  groupSize,
  onSaved,
}: Props) {
  const [place, setPlace] = useState(destination);
  const [guests, setGuests] = useState(groupSize ? String(groupSize) : "");
  const [budget, setBudget] = useState("");
  const [wishes, setWishes] = useState("");
  const [sources, setSources] = useState<AccommodationSource[]>(["booking", "micazu", "web"]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"search" | "lookup" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [candidates, setCandidates] = useState<AccommodationCandidate[]>([]);
  const [period, setPeriod] = useState({ startDate: startDate || "", endDate: endDate || "" });
  const [addedUrls, setAddedUrls] = useState<string[]>([]);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);
  const [shortlisting, setShortlisting] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlace(destination);
    setGuests(groupSize ? String(groupSize) : "");
    setPeriod({ startDate: startDate || "", endDate: endDate || "" });
    setError("");
    setNotice("");
    setCandidates([]);
    setAddedUrls([]);
    setShortlisted(false);
    setUrl("");
  }, [open, destination, groupSize, startDate, endDate]);

  const toggleSource = (id: AccommodationSource) => {
    setSources((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  };

  const runSearch = async () => {
    setBusy("search");
    setError("");
    setNotice("");
    setCandidates([]);
    setAddedUrls([]);
    setShortlisted(false);
    try {
      const result = await searchAccommodations({
        tripId,
        destination: place.trim(),
        startDate: period.startDate,
        endDate: period.endDate,
        guests: guests ? Number(guests) : null,
        budget: budget ? Number(budget) : null,
        wishes,
        sources: sources.length > 0 ? sources : ["booking", "web"],
      });
      setCandidates(result.candidates);
      if (result.period.startDate || result.period.endDate) setPeriod(result.period);
      if (result.candidates.length === 0) {
        setError("Niets bruikbaars gevonden. Probeer een andere plaats of meer bronnen.");
      } else if (result.emptySources.length > 0) {
        setNotice(`Geen resultaten van ${result.emptySources.join(", ")}. Die sites blokkeren soms automatisch zoeken.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Zoeken lukte niet.");
    } finally {
      setBusy(null);
    }
  };

  const runLookup = async () => {
    setBusy("lookup");
    setError("");
    setNotice("");
    try {
      const candidate = await lookupAccommodationUrl(tripId, url.trim());
      if (!candidate) {
        setError("Uit deze link kwam geen accommodatie.");
        return;
      }
      setCandidates((current) => [candidate, ...current.filter((entry) => entry.url !== candidate.url)]);
      setUrl("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Uitlezen lukte niet.");
    } finally {
      setBusy(null);
    }
  };

  const addStay = async (candidate: AccommodationCandidate) => {
    setSavingUrl(candidate.url);
    setError("");
    try {
      await addCandidateAsStay(tripId, candidate, period);
      setAddedUrls((current) => [...current, candidate.url]);
      await onSaved();
    } catch (cause) {
      console.error("accommodation stay insert failed", cause);
      setError("Op de tijdlijn zetten lukte niet.");
    } finally {
      setSavingUrl(null);
    }
  };

  const makeShortlist = async () => {
    setShortlisting(true);
    setError("");
    try {
      await createAccommodationDecision(tripId, candidates.slice(0, 6));
      setShortlisted(true);
    } catch (cause) {
      console.error("accommodation decision failed", cause);
      setError("De keuze aanmaken lukte niet.");
    } finally {
      setShortlisting(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Verblijf zoeken"
      description="Hansie zoekt op Booking, Airbnb, vakantiehuissites en het web. Prijzen zijn indicaties; controleer altijd bij de aanbieder."
    >
      <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Input value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Plaats of regio" className="col-span-2 text-base" />
            <Input value={guests} onChange={(event) => setGuests(event.target.value)} inputMode="numeric" placeholder="Personen" className="text-base" />
            <Input value={budget} onChange={(event) => setBudget(event.target.value)} inputMode="numeric" placeholder="Budget totaal (€)" className="text-base" />
            <Input value={wishes} onChange={(event) => setWishes(event.target.value)} placeholder="Wensen, bijv. zwembad, centrum" className="col-span-2 text-base" />
          </div>

          <div className="flex flex-wrap gap-2">
            {accommodationSources.map((source) => {
              const active = sources.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => toggleSource(source.id)}
                  aria-pressed={active}
                  className={`inline-flex h-8 items-center rounded-full border px-3 font-ui text-[13px] font-medium transition-colors ${
                    active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
                  }`}
                >
                  {source.label}
                </button>
              );
            })}
          </div>

          <Button type="button" onClick={() => void runSearch()} disabled={busy !== null || place.trim().length < 2} className="w-full">
            {busy === "search" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {busy === "search" ? "Hansie zoekt…" : "Zoeken"}
          </Button>

          <div className="flex gap-2 border-t border-rule pt-4">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Of plak een link van een aanbieding"
              className="flex-1 text-base"
            />
            <Button type="button" variant="outline" onClick={() => void runLookup()} disabled={busy !== null || !/^https?:\/\//i.test(url.trim())}>
              {busy === "lookup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" strokeWidth={1.75} />}
            </Button>
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

          {candidates.length > 0 && (
            <>
              <div className="border-t border-rule">
                {candidates.map((candidate) => {
                  const added = addedUrls.includes(candidate.url);
                  return (
                    <div key={candidate.url} className="flex items-start gap-3 border-b border-rule py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium leading-tight">{candidate.name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {candidateFacts(candidate) || candidate.summary || "Geen details gevonden"}
                        </p>
                        <a
                          href={candidate.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline underline-offset-2"
                        >
                          <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                          Bekijk aanbieding
                        </a>
                      </div>
                      {added ? (
                        <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-muted-foreground">
                          <Check className="h-3.5 w-3.5" strokeWidth={2} />
                          Op tijdlijn
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 rounded-full"
                          disabled={savingUrl === candidate.url}
                          onClick={() => void addStay(candidate)}
                        >
                          {savingUrl === candidate.url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Op tijdlijn"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={shortlisting || shortlisted}
                onClick={() => void makeShortlist()}
              >
                {shortlisting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {shortlisted ? "Shortlist staat bij Samen > Keuzes" : "Shortlist als keuze voor de groep"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
