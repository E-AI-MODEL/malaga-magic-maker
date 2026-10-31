import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, Minus, Plus, UserRound, Users } from "lucide-react";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { createInvite } from "@/features/invites/data";
import { partyTypeOptions, saveTravelerProfile } from "@/features/travelers/data";
import { emptyTravelerDraft, TravelerProfileForm, type TravelerProfileDraft } from "@/features/travelers/TravelerProfileForm";
import { describePlanLimit } from "@/features/pro/limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/primitives";
import { Textarea } from "@/components/ui/textarea";
import { StepError, StepFrame, StepNext, StepQuestion, StepSummary, StepTile, useStepFlow } from "@/components/steps";

const currencies = ["EUR", "USD", "GBP", "CHF"];

export type TripStep = "name" | "where" | "when" | "who" | "size" | "invite" | "wishes" | "summary";

/** Alone or as a couple there is no head count to ask; alone there is nobody to invite. */
export function newTripSteps(partyType: string): TripStep[] {
  const steps: TripStep[] = ["name", "where", "when", "who"];
  if (["family", "friends", "business"].includes(partyType)) steps.push("size");
  if (partyType !== "solo") steps.push("invite");
  steps.push("wishes", "summary");
  return steps;
}

const formatDay = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

export default function NewTrip() {
  const { createTrip } = useTrip();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const parsedEmails = inviteEmails
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const handleSubmit = async () => {
    setError("");

    if (!name.trim()) {
      flow.go("name");
      setError("Geef je reis een naam.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      flow.go("when");
      setError("De einddatum kan niet vóór de startdatum liggen.");
      return;
    }

    const invalidEmail = parsedEmails.find((value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    if (invalidEmail) {
      flow.go("invite");
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
            healthConsent: profile.healthConsent,
            healthConsentAt: profile.healthConsentAt,
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

  const solo = partyType === "solo";
  const steps: TripStep[] = newTripSteps(partyType);
  const datesValid = !(startDate && endDate && endDate < startDate);
  const flow = useStepFlow<TripStep>(steps, { name: Boolean(name.trim()), when: datesValid, invite: !parsedEmails.some((v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) }, "summary");
  const after = (target: TripStep) => flow.go(flow.backToSummary ? "summary" : target);
  const nextOf = (current: TripStep) => steps[steps.indexOf(current) + 1] || "summary";
  const choosePeople = (value: string) => {
    setPartyType(value);
    const size = value === "solo" ? 1 : value === "couple" ? 2 : Math.max(3, Number.parseInt(groupSize, 10) || 3);
    setGroupSize(String(size));
    const nextSteps = newTripSteps(value);
    flow.go(flow.backToSummary && value !== "family" && value !== "friends" && value !== "business" ? "summary" : nextSteps[nextSteps.indexOf("who") + 1]);
  };
  const dateLabel = startDate ? `${formatDay(startDate)}${endDate ? ` – ${formatDay(endDate)}` : ""}` : "Nog niet bekend";
  const whereLabel = [destination.trim(), country.trim()].filter(Boolean).join(", ") || "Nog niet bekend";
  const whoLabel = partyType ? `${partyTypeOptions.find((o) => o.value === partyType)?.label}${!solo && partyType !== "couple" ? ` · ${groupSize} personen` : ""}` : "Nog niet gekozen";

  if (inviteLinks.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-xl px-5 py-7 sm:py-12">
          <p className="text-xs font-medium text-muted-foreground">{name.trim()}</p>
          <PageHeader className="mt-2" title="Je reis staat klaar." />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Stuur deze persoonlijke links door. Ze zijn zeven dagen geldig en werken één keer. Later opnieuw ophalen kan niet.
          </p>
          <div className="mt-7 space-y-3">
            {inviteLinks.map((link) => (
              <div key={link.email} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">{link.email}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{link.url}</p>
                <Button type="button" variant="outline" className="mt-3 h-12 w-full rounded-xl" onClick={() => { void navigator.clipboard.writeText(link.url); setCopiedLink(link.url); }}>
                  {copiedLink === link.url ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copiedLink === link.url ? "Gekopieerd" : "Kopieer link"}
                </Button>
              </div>
            ))}
          </div>
          <StepNext onClick={() => navigate(`/trip/${createdTripId}`, { replace: true })}>Naar mijn reis</StepNext>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col">
        <StepFrame total={steps.length} index={flow.index} onBack={flow.back} onClose={() => navigate("/trips")} closeLabel="Terug naar Home" onSwipeNext={flow.step !== "summary" ? flow.next : undefined}>
          {flow.step === "name" && <form onSubmit={(e: FormEvent) => { e.preventDefault(); flow.next(); }}>
            <StepQuestion sub="Meer is niet nodig. De rest vul je later aan.">Geef je reis een naam</StepQuestion>
            <Input aria-label="Naam van de reis" autoFocus autoComplete="off" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Bijvoorbeeld zomer in Italië" className="h-16 rounded-2xl text-xl" />
            <StepNext disabled={!name.trim()}>{flow.backToSummary ? "Klaar" : "Volgende"}</StepNext>
          </form>}

          {flow.step === "where" && <form onSubmit={(e: FormEvent) => { e.preventDefault(); after(nextOf("where")); }}>
            <StepQuestion>Vul je bestemming in</StepQuestion>
            <Input aria-label="Bestemming" autoFocus value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Plaats of regio" className="h-16 rounded-2xl text-xl" />
            <Input aria-label="Land" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Land" className="mt-3 h-14 rounded-2xl text-lg" />
            <StepNext>{destination.trim() || country.trim() ? (flow.backToSummary ? "Klaar" : "Volgende") : "Sla over"}</StepNext>
          </form>}

          {flow.step === "when" && <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (datesValid) after(nextOf("when")); }}>
            <StepQuestion>Kies je data</StepQuestion>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="text-sm font-semibold text-muted-foreground">Van</span><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-2 h-14 rounded-2xl text-lg" /></label>
              <label><span className="text-sm font-semibold text-muted-foreground">Tot</span><Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="mt-2 h-14 rounded-2xl text-lg" /></label>
            </div>
            {!datesValid && <StepError message="De einddatum kan niet vóór de startdatum liggen." />}
            <StepNext disabled={!datesValid}>{startDate || endDate ? (flow.backToSummary ? "Klaar" : "Volgende") : "Sla over"}</StepNext>
          </form>}

          {flow.step === "who" && <div className="space-y-3">
            <StepQuestion>Kies je gezelschap</StepQuestion>
            {partyTypeOptions.map((o) => <StepTile key={o.value} selected={partyType === o.value} icon={o.value === "solo" ? <UserRound /> : <Users />} onClick={() => choosePeople(o.value)}>{o.label}</StepTile>)}
          </div>}

          {flow.step === "size" && <div>
            <StepQuestion>Stel het aantal personen in</StepQuestion>
            <div className="flex items-center justify-center gap-6 py-4">
              <Button type="button" variant="outline" className="h-16 w-16 rounded-full text-3xl" aria-label="Minder" onClick={() => setGroupSize(String(Math.max(2, (Number.parseInt(groupSize, 10) || 2) - 1)))}><Minus className="h-7 w-7" /></Button>
              <span className="num w-24 text-center font-display text-7xl font-semibold" aria-live="polite">{groupSize}</span>
              <Button type="button" variant="outline" className="h-16 w-16 rounded-full text-3xl" aria-label="Meer" onClick={() => setGroupSize(String(Math.min(99, (Number.parseInt(groupSize, 10) || 2) + 1)))}><Plus className="h-7 w-7" /></Button>
            </div>
            <StepNext onClick={() => after(nextOf("size"))}>{flow.backToSummary ? "Klaar" : "Volgende"}</StepNext>
          </div>}

          {flow.step === "invite" && <form onSubmit={(e: FormEvent) => { e.preventDefault(); flow.next(); }}>
            <StepQuestion sub="Eén e-mailadres per regel. Je krijgt per persoon een link om te delen.">Nodig je reisgenoten uit</StepQuestion>
            <Textarea aria-label="E-mailadressen" value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} placeholder={"naam@voorbeeld.nl\nander@voorbeeld.nl"} rows={4} className="rounded-2xl text-lg" />
            {!flow.complete && parsedEmails.length > 0 && <StepError message="Een adres klopt niet. Check de spelling." />}
            <StepNext>{parsedEmails.length ? (flow.backToSummary ? "Klaar" : "Volgende") : "Nodig later uit"}</StepNext>
          </form>}

          {flow.step === "wishes" && <div>
            <StepQuestion sub="Hansie gebruikt ze voor tips. Overslaan mag.">Geef je wensen op</StepQuestion>
            <TravelerProfileForm value={profile} onChange={setProfile} idPrefix="new-trip" />
            <StepNext onClick={() => after("summary")}>{flow.backToSummary ? "Klaar" : "Volgende"}</StepNext>
          </div>}

          {flow.step === "summary" && <div className="space-y-5">
            <StepQuestion sub="Alles is later aan te passen.">Check je reis</StepQuestion>
            <StepSummary rows={[
              { label: "Reis", value: name.trim(), onEdit: () => flow.edit("name") },
              { label: "Waarheen", value: whereLabel, onEdit: () => flow.edit("where") },
              { label: "Wanneer", value: dateLabel, onEdit: () => flow.edit("when") },
              { label: "Met wie", value: whoLabel, onEdit: () => flow.edit("who") },
              ...(steps.includes("invite") ? [{ label: "Uitnodigen", value: parsedEmails.length ? `${parsedEmails.length} ${parsedEmails.length === 1 ? "persoon" : "personen"}` : "Later", onEdit: () => flow.edit("invite") }] : []),
              { label: "Valuta", value: currency, onEdit: () => setCurrency(currencies[(currencies.indexOf(currency) + 1) % currencies.length]) },
            ]} />
            <StepError message={error} />
            <StepNext onClick={() => void handleSubmit()} busy={submitting} disabled={!flow.complete} done>Reis starten</StepNext>
          </div>}
        </StepFrame>
      </div>
    </div>
  );
}
