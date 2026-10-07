import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, MapPin } from "lucide-react";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { createInvite } from "@/features/invites/data";
import { partyTypeOptions, saveTravelerProfile } from "@/features/travelers/data";
import { emptyTravelerDraft, TravelerProfileForm, type TravelerProfileDraft } from "@/features/travelers/TravelerProfileForm";
import { describePlanLimit } from "@/features/pro/limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const currencies = ["EUR", "USD", "GBP", "CHF"];

export default function NewTrip() {
  const { createTrip } = useTrip();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupSize, setGroupSize] = useState("1");
  const [currency, setCurrency] = useState("EUR");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [partyType, setPartyType] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [profile, setProfile] = useState<TravelerProfileDraft>(emptyTravelerDraft);
  const [createdTripId, setCreatedTripId] = useState("");
  const [inviteLinks, setInviteLinks] = useState<Array<{ email: string; url: string }>>([]);
  const [copiedLink, setCopiedLink] = useState("");
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam");

  const goToDetails = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Geef je reis een naam.");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToGroup = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (startDate && endDate && endDate < startDate) {
      setError("De einddatum kan niet vóór de startdatum liggen.");
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const parsedEmails = inviteEmails
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setStep(1);
      setError("Geef je reis een naam.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setStep(2);
      setError("De einddatum kan niet vóór de startdatum liggen.");
      return;
    }

    const invalidEmail = parsedEmails.find((value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    if (invalidEmail) {
      setError(`${invalidEmail} lijkt geen geldig e-mailadres.`);
      return;
    }

    setSubmitting(true);
    try {
      const trip = await createTrip({
        name: name.trim(),
        description: description.trim() || undefined,
        destination_name: destination.trim() || undefined,
        destination_country: country.trim() || undefined,
        start_date: startDate || null,
        end_date: endDate || null,
        group_size: Math.max(1, Number.parseInt(groupSize, 10) || 1),
        timezone,
        currency,
      });

      if (!trip) {
        setError("De reis kon niet worden aangemaakt. Probeer het opnieuw.");
        return;
      }

      if (partyType) {
        const { error: partyError } = await supabase.from("trip").update({ party_type: partyType }).eq("id", trip.id);
        if (partyError) console.error("party type update failed", partyError.message);
      }

      const hasWishes =
        profile.priorities.length > 0 ||
        profile.diet.length > 0 ||
        Boolean(profile.allergies || profile.pace || profile.comfort || profile.budgetFeel || profile.mobility || profile.notes);

      if (hasWishes && user) {
        try {
          await saveTravelerProfile({
            tripId: trip.id,
            userId: user.id,
            priorities: profile.priorities,
            diet: profile.diet,
            allergies: profile.allergies,
            pace: profile.pace,
            comfort: profile.comfort,
            budgetFeel: profile.budgetFeel,
            mobility: profile.mobility,
            notes: profile.notes,
          });
        } catch (caught) {
          console.error("traveler profile save failed", caught);
        }
      }

      if (parsedEmails.length > 0) {
        const links: Array<{ email: string; url: string }> = [];
        for (const email of parsedEmails) {
          try {
            const token = await createInvite({ tripId: trip.id, email, expiresHours: 168, maxUses: 1 });
            if (typeof token === "string") links.push({ email, url: `${window.location.origin}/join/${token}` });
          } catch (caught) {
            console.error("invite create failed", caught);
          }
        }
        if (links.length > 0) {
          setCreatedTripId(trip.id);
          setInviteLinks(links);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }

      navigate(`/trip/${trip.id}`, { replace: true });
    } catch (caught) {
      setError(describePlanLimit(caught) ?? "De reis kon niet worden aangemaakt. Probeer het opnieuw.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-5 py-7 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" className="-ml-3">
            <Link to="/trips">
              <ArrowLeft className="mr-2 h-4 w-4" />Mijn reizen
            </Link>
          </Button>
          <span className="text-xs font-semibold text-muted-foreground">Stap {step} van 3</span>
        </div>

        <div className="mt-6 flex gap-2" aria-hidden="true">
          {[1, 2, 3].map((item) => (
            <span key={item} className={`h-1.5 flex-1 rounded-full ${step >= item ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        {inviteLinks.length > 0 ? (
          <>
            <div className="mt-9">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{name.trim()}</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-normal sm:text-4xl">Je reis staat klaar.</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Stuur deze persoonlijke links door. Ze zijn zeven dagen geldig en werken één keer. Later opnieuw ophalen kan niet.
              </p>
            </div>

            <div className="mt-7 space-y-3">
              {inviteLinks.map((link) => (
                <div key={link.email} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm font-semibold">{link.email}</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{link.url}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      void navigator.clipboard.writeText(link.url);
                      setCopiedLink(link.url);
                    }}
                  >
                    {copiedLink === link.url ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copiedLink === link.url ? "Gekopieerd" : "Kopieer link"}
                  </Button>
                </div>
              ))}
            </div>

            <Button className="mt-7 h-12 w-full font-bold" onClick={() => navigate(`/trip/${createdTripId}`, { replace: true })}>
              Naar mijn reis <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : step === 1 ? (
          <>
            <div className="mt-9">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nieuwe reis</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-normal sm:text-4xl">Hoe heet je reis?</h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Een naam is genoeg. Bestemming en data kun je later aanvullen.
              </p>
            </div>

            <form onSubmit={goToDetails} className="mt-9 space-y-6">
              <div>
                <label className="text-sm font-semibold" htmlFor="trip-name">Hoe noem je deze reis? *</label>
                <Input
                  id="trip-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Bijv. Zomer in Italië"
                  className="mt-2 h-12"
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Weet je al waarheen?</p>
                    <p className="mt-1 text-xs text-muted-foreground">Mag leeg blijven als de bestemming nog niet vaststaat.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="destination">Bestemming</label>
                    <Input
                      id="destination"
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder="Plaats of regio"
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="country">Land</label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      placeholder="Bijv. Italië"
                      className="mt-1.5 h-11"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

              <Button type="submit" className="h-12 w-full font-bold">
                Verder <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </>
        ) : step === 2 ? (
          <>
            <div className="mt-9">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{name.trim()}</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-normal sm:text-4xl">Wat weet je al?</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Alles hieronder is optioneel. Sla over wat nog niet vaststaat en vul het later aan vanuit je reis.
              </p>
            </div>

            <form onSubmit={goToGroup} className="mt-9 space-y-6">
              <div className="border-t border-rule/10 pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-ui text-[15px] font-semibold">Wanneer ga je?</p>
                  <span className="text-xs text-muted-foreground">Optioneel</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="start-date">Van</label>
                    <Input id="start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="end-date">Tot</label>
                    <Input id="end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1.5 h-11" />
                  </div>
                </div>
              </div>

              <div className="border-t border-rule/10 pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-ui text-[15px] font-semibold">Wie gaat er mee?</p>
                  <span className="text-xs text-muted-foreground">Solo begint bij 1</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="group-size">Reizigers</label>
                    <Input id="group-size" type="number" min={1} max={99} value={groupSize} onChange={(event) => setGroupSize(event.target.value)} className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="currency">Valuta</label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {currencies.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-rule/10 pt-4">
                <label className="font-ui text-[15px] font-semibold" htmlFor="description">Iets dat je wilt onthouden?</label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Bijv. rustig tempo, familiebezoek of nog te beslissen"
                  className="mt-2"
                  rows={3}
                />
              </div>

              {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="h-12" onClick={() => { setError(""); setStep(1); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" />Terug
                </Button>
                <Button type="submit" className="h-12 flex-1 font-bold">
                  Verder <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">Je kunt al deze gegevens later wijzigen.</p>
            </form>
          </>
        ) : (
          <>
            <div className="mt-9">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{name.trim()}</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-normal sm:text-4xl">Met wie en hoe?</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Nodig meteen mensen uit en vertel wat jij belangrijk vindt. Hansie houdt hier rekening mee bij suggesties.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-9 space-y-6">
              <fieldset className="border-t border-rule/20 pt-4">
                <legend className="sr-only">Reisgezelschap</legend>
                <p className="font-ui text-[15px] font-semibold">Wat voor gezelschap is dit?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {partyTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={partyType === option.value}
                      onClick={() => setPartyType(partyType === option.value ? "" : option.value)}
                      className={`min-h-[36px] rounded-full border px-3 text-[13px] font-semibold transition-colors ${
                        partyType === option.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-rule/40 bg-card text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="border-t border-rule/20 pt-4">
                <label className="font-ui text-[15px] font-semibold" htmlFor="invite-emails">
                  Wie nodig je uit?
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  E-mailadressen, gescheiden door komma of nieuwe regel. Je krijgt straks per persoon een uitnodigingslink.
                </p>
                <Textarea
                  id="invite-emails"
                  value={inviteEmails}
                  onChange={(event) => setInviteEmails(event.target.value)}
                  placeholder="naam@example.com, ander@example.com"
                  className="mt-2"
                  rows={3}
                />
              </div>

              <TravelerProfileForm value={profile} onChange={setProfile} idPrefix="new-trip" />

              {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="h-12" onClick={() => { setError(""); setStep(2); }} disabled={submitting}>
                  <ArrowLeft className="mr-2 h-4 w-4" />Terug
                </Button>
                <Button type="submit" className="h-12 flex-1 font-bold" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Reis starten
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">Je kunt alles later aanpassen vanuit je reis.</p>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
