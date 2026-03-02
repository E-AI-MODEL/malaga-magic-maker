import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, Check, Plane, Car, MapPin, Home, UtensilsCrossed, Dumbbell, Clock, MessageSquare } from "lucide-react";
import { DilemmaGame } from "@/components/DilemmaGame";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { useDeadline } from "@/hooks/useDeadline";
import { useLogEvent } from "@/contexts/ActivityLogContext";
import heroGolf from "@/assets/hero-golf.jpg";
import heroTransport from "@/assets/hero-transport.jpg";
import heroBeachTown from "@/assets/hero-beach-town.jpg";
import heroVilla from "@/assets/hero-villa.jpg";

type ChoiceValue = string | number | boolean;

const EDWIN_USER_ID = "d08ef813-36ad-46bb-bd7d-d7dd36d8b3a8";
const PIETER_USERNAME = "pieter";

export default function Intake() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { deadline, isPastDeadline, timeRemaining } = useDeadline();
  const logEvent = useLogEvent();
  const hasLoggedStart = useRef(false);
  const [locked, setLocked] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [agreedFacts, setAgreedFacts] = useState(false);
  const [preferredRounds, setPreferredRounds] = useState<2 | 3 | null>(null);
  const [mobilityChoice, setMobilityChoice] = useState("neutral");
  const [baseChoice, setBaseChoice] = useState("neutral");
  const [maxTravelMinutes, setMaxTravelMinutes] = useState<10 | 15 | 20 | 30>(20);
  const [requireFixedBeds, setRequireFixedBeds] = useState(false);
  const [requireBedrooms3, setRequireBedrooms3] = useState(false);
  const [requireTransparentPrice, setRequireTransparentPrice] = useState(false);
  const [requirePool, setRequirePool] = useState(false);
  const [requireAirco, setRequireAirco] = useState(false);
  const [requireWifi, setRequireWifi] = useState(false);
  const [requireParking, setRequireParking] = useState(false);
  const [requireTerrace, setRequireTerrace] = useState(false);
  const [budgetCap, setBudgetCap] = useState("");
  const [dietPreferences, setDietPreferences] = useState<string[]>([]);
  const [dietRemarks, setDietRemarks] = useState("");
  const [activities, setActivities] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  // Fun popups
  const [showEdPopup, setShowEdPopup] = useState(false);
  const [edPopupMessage, setEdPopupMessage] = useState("");

  const [points, setPoints] = useState({
    golfEase: 20, beachLife: 20, exploring: 20, luxury: 20, budget: 10, lowHassle: 10
  });
  const totalPoints = Object.values(points).reduce((a, b) => a + b, 0);

  const isEdwin = user?.id === EDWIN_USER_ID;
  const isPieter = profile?.username?.toLowerCase() === PIETER_USERNAME;
  const isNonGolfer = isEdwin || isPieter;
  const isDisabled = isPastDeadline;

  useEffect(() => {
    if (!user) return;
    supabase.from("submissions").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          setLocked(data.locked);
          setAgreedFacts(data.agreed_facts);
          setPreferredRounds(data.preferred_rounds as 2 | 3);
          setMobilityChoice(data.mobility_choice);
          setBaseChoice(data.base_choice);
          setMaxTravelMinutes(data.max_golf_minutes as 10 | 15 | 20 | 30);
          setRequireFixedBeds(data.require_fixed_beds);
          setRequireBedrooms3(data.require_bedrooms_3);
          setRequireTransparentPrice(data.require_transparent_price);
          setRequirePool((data as any).require_pool ?? false);
          setRequireAirco((data as any).require_airco ?? false);
          setRequireWifi((data as any).require_wifi ?? false);
          setRequireParking((data as any).require_parking ?? false);
          setRequireTerrace((data as any).require_terrace ?? false);
          setBudgetCap(data.budget_cap_total?.toString() || "");
          setDietPreferences((data as any).diet_preferences || []);
          setDietRemarks((data as any).diet_remarks || "");
          setActivities((data as any).activities || []);
          // Merge old remarks_a + remarks_b into single remarks field
          const combinedRemarks = [data.remarks_a, data.remarks_b].filter(Boolean).join("\n");
          setRemarks(combinedRemarks);
          setPoints({
            golfEase: data.points_golf_ease, beachLife: data.points_beach_life,
            exploring: data.points_exploring, luxury: data.points_luxury,
            budget: data.points_budget, lowHassle: data.points_low_hassle,
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleRoundsClick = (value: 2 | 3) => {
    if (isNonGolfer) {
      setEdPopupMessage(isEdwin ? "Ed, ik zei toch dat je hier niet op moest klikken?" : "Pieter, jij golft niet! Klik op jouw eigen knop.");
      setShowEdPopup(true);
      return;
    }
    setPreferredRounds(value);
    if (!hasLoggedStart.current) { hasLoggedStart.current = true; logEvent("intake_started", "/intake"); }
  };

  const handleEddieClick = () => {
    if (!isEdwin) {
      setEdPopupMessage("HEET JIJ ED?!");
      setShowEdPopup(true);
      return;
    }
    setPreferredRounds(null);
    toast.success("Goed zo Ed! Kies maar hoeveel rondes je wilt.");
  };

  const handlePieterLoungeClick = () => {
    if (!isPieter) {
      setEdPopupMessage("Deze knop is alleen voor Pieter! 🏖️");
      setShowEdPopup(true);
      return;
    }
    logEvent("external_link_click", "/intake", "https://www.maxbeach.es/pool-beach");
    window.open("https://www.maxbeach.es/pool-beach", "_blank");
  };

  const handleSubmit = async () => {
    if (isPastDeadline) { toast.error("De deadline is verstreken"); return; }
    if (!agreedFacts) { toast.error("Je moet akkoord gaan met de vaste gegevens"); return; }
    logEvent("intake_submitted", "/intake");
    if (!isNonGolfer && preferredRounds === null) { toast.error("Kies het aantal rondes golf"); return; }
    if (totalPoints !== 100) { toast.error("Speel eerst het dilemma-spel om je punten te verdelen"); return; }
    if (!user) return;
    setSubmitting(true);
    const payload = {
      user_id: user.id, agreed_facts: agreedFacts, preferred_rounds: preferredRounds,
      remarks_a: remarks || null, remarks_b: null,
      mobility_choice: mobilityChoice, base_choice: baseChoice,
      max_golf_minutes: maxTravelMinutes, require_fixed_beds: requireFixedBeds,
      require_bedrooms_3: requireBedrooms3,
      require_transparent_price: requireTransparentPrice,
      require_pool: requirePool, require_airco: requireAirco,
      require_wifi: requireWifi, require_parking: requireParking,
      require_terrace: requireTerrace,
      budget_cap_total: budgetCap ? Number(budgetCap) : null,
      points_golf_ease: points.golfEase, points_beach_life: points.beachLife,
      points_exploring: points.exploring, points_luxury: points.luxury,
      points_budget: points.budget, points_low_hassle: points.lowHassle, locked: true,
      diet_preferences: dietPreferences,
      diet_remarks: dietRemarks || null,
      activities: activities,
    };
    let error;
    if (existingId) {
      ({ error } = await supabase.from("submissions").update(payload).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("submissions").insert(payload));
    }
    if (error) { toast.error("Opslaan mislukt: " + error.message); }
    else { toast.success("Intake opgeslagen en gelocked!"); setLocked(true); }
    setSubmitting(false);
  };

  if (loading) return <AppLayout><div className="flex justify-center py-12 text-sm text-muted-foreground">Laden...</div></AppLayout>;

  if (locked) {
    return (
      <AppLayout>
        <div className="-mx-4 -mt-6">
          <div className="relative h-[60vh] flex items-center justify-center">
            <img src={heroGolf} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative z-10 text-center px-6">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary mb-4">
                <Check className="h-10 w-10 text-primary-foreground" strokeWidth={3} />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-white">Intake ingevuld</h2>
              <p className="text-white/60 text-sm mt-2">Je antwoorden zijn opgeslagen en gelocked.</p>
              <Button onClick={() => navigate("/accommodations")} className="mt-6 gap-2">
                Bekijk verblijven <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const travelLabel = baseChoice === "golf"
    ? "Max reistijd strand / dorpje"
    : baseChoice === "beach"
      ? "Max reistijd golfbaan"
      : "Max reistijd";

  const RadioOption = ({ name, value, current, onChange, label }: { name: string; value: ChoiceValue; current: ChoiceValue; onChange: (v: any) => void; label: string }) => (
    <label className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all ${current === value ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} className="hidden" disabled={isDisabled} />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );

  const DarkRadioOption = ({ name, value, current, onChange, label }: { name: string; value: ChoiceValue; current: ChoiceValue; onChange: (v: any) => void; label: string }) => (
    <label className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all ${current === value ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/15"}`}>
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} className="hidden" disabled={isDisabled} />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );

  // Deadline banner color
  const deadlineBannerClass = (() => {
    if (!deadline) return "";
    const diff = deadline.getTime() - Date.now();
    if (diff <= 0) return "bg-destructive text-destructive-foreground";
    if (diff < 3_600_000) return "bg-destructive text-destructive-foreground";
    if (diff < 21_600_000) return "bg-warning text-warning-foreground";
    return "bg-primary text-primary-foreground";
  })();

  return (
    <AppLayout>
      <div className="-mx-4 -mt-6 space-y-0">
        {/* Hero header */}
        <div className="relative h-40">
          <img src={heroGolf} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />
          <div className="relative z-10 flex items-end h-full px-6 pb-5">
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em]">Intake</p>
              <h2 className="font-display text-2xl font-extrabold text-white mt-1">Jouw voorkeuren</h2>
            </div>
          </div>
        </div>

        {/* Deadline banner */}
        {deadline && (
          <div className={`px-6 py-3 flex items-center justify-between ${deadlineBannerClass}`}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {isPastDeadline ? "Stemming gesloten" : `Deadline: ${timeRemaining}`}
              </span>
            </div>
          </div>
        )}

        {/* Deadline overlay */}
        {isPastDeadline && (
          <div className="bg-destructive/10 border-destructive/20 border rounded-lg mx-6 mt-4 p-6 text-center space-y-2">
            <p className="text-destructive font-bold text-lg">De stemming is gesloten</p>
            <p className="text-sm text-muted-foreground">De deadline is verstreken. Neem contact op met de admin als je toch nog wilt invullen.</p>
          </div>
        )}

        {/* Block A — Vaste gegevens */}
        <section className="bg-foreground text-background px-6 py-8 space-y-5">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-display font-extrabold text-sm">A</div>
              <h3 className="font-display font-extrabold text-base text-white">Vaste gegevens</h3>
            </div>
          </div>

          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-3">
              <Plane className="h-4 w-4 mt-0.5 shrink-0 text-white/40" />
              <div>
                <p className="text-white/90 font-semibold">Vluchten</p>
                <p>Do-ochtend: Robin, Mark &amp; Dimitri</p>
                <p>Do-middag: Edwin &amp; Hans</p>
                <p>Pieter: <span className="italic text-white/50">(nog) onbekend</span></p>
                <p>Zo-ochtend: Iedereen terug</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-white/40" />
              <div>
                <p className="text-white/90 font-semibold">Golf</p>
                <p>Minimaal 2 rondes 18 holes bij La Cala Golf <span className="italic text-white/40">(m.u.v. Pieter &amp; Edwin)</span></p>
              </div>
            </div>
            <p className="text-white/50 text-xs">2 – 5 april 2026 · 6 volwassenen</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={agreedFacts} onCheckedChange={(c) => !isDisabled && setAgreedFacts(!!c)} disabled={isDisabled} className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
            <span className="text-sm text-white/80">Ik ga akkoord met de vaste gegevens</span>
          </label>

          <div className="border-t border-white/10 pt-5 space-y-3">
            <p className="text-sm text-white/70">
              Er staat nog <span className="text-white font-semibold">één ding</span> niet vast: hoeveel rondes golf we spelen. Dat bepaalt Edwin.
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Hoeveel rondes golf?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRoundsClick(2)}
                disabled={isDisabled}
                className={`p-3.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${preferredRounds === 2 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/15"}`}
              >
                2 rondes
              </button>
              <button
                onClick={() => handleRoundsClick(3)}
                disabled={isDisabled}
                className={`p-3.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${preferredRounds === 3 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/15"}`}
              >
                3 rondes
              </button>
              <button
                onClick={handleEddieClick}
                disabled={isDisabled}
                className="p-3.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 bg-accent text-accent-foreground hover:bg-accent/80"
              >
                🏌️ Eddie de Caddy
              </button>
              <button
                onClick={handlePieterLoungeClick}
                disabled={isDisabled}
                className="p-3.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 bg-accent text-accent-foreground hover:bg-accent/80"
              >
                🏖️ Lounge tip Pieter
              </button>
            </div>
          </div>
        </section>

        {/* Block B — Voorkeuren */}
        <section className="space-y-0">
          <div className="relative min-h-[280px] flex items-end">
            <img src={heroTransport} alt="Vervoer" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/10" />
            <div className="relative z-10 px-6 py-8 w-full space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-display font-extrabold text-sm text-white">B</div>
                <h3 className="font-display font-extrabold text-base text-white">Jouw voorkeuren</h3>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2"><Car className="h-3.5 w-3.5" /> Vervoer</p>
              <div className="space-y-2">
                <DarkRadioOption name="mobility" value="car" current={mobilityChoice} onChange={v => !isDisabled && setMobilityChoice(v)} label="Huurauto" />
                <DarkRadioOption name="mobility" value="transfers" current={mobilityChoice} onChange={v => !isDisabled && setMobilityChoice(v)} label="Transfers + taxi's" />
                <DarkRadioOption name="mobility" value="neutral" current={mobilityChoice} onChange={v => !isDisabled && setMobilityChoice(v)} label="Geen voorkeur" />
              </div>
            </div>
          </div>

          <div className="relative min-h-[380px] flex items-end">
            <img src={heroBeachTown} alt="Locatie" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/20" />
            <div className="relative z-10 px-6 py-8 w-full space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-extrabold text-white">Locatie accommodatie</h3>
              </div>
              <div className="space-y-2">
                <DarkRadioOption name="base" value="golf" current={baseChoice} onChange={v => !isDisabled && setBaseChoice(v)} label="Bij de golfbaan (La Cala Golf)" />
                <DarkRadioOption name="base" value="beach" current={baseChoice} onChange={v => !isDisabled && setBaseChoice(v)} label="Bij het strand (La Cala / Calahonda)" />
                <DarkRadioOption name="base" value="neutral" current={baseChoice} onChange={v => !isDisabled && setBaseChoice(v)} label="Geen voorkeur" />
              </div>

              <div className="border-t border-white/10 pt-5">
                <h4 className="font-display text-base font-bold text-white mb-3">{travelLabel}</h4>
                <div className="grid grid-cols-4 gap-2">
                  {([10, 15, 20, 30] as const).map(v => (
                    <DarkRadioOption key={v} name="travelMin" value={v} current={maxTravelMinutes} onChange={val => !isDisabled && setMaxTravelMinutes(val)} label={`${v} min`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative min-h-[200px] flex items-end">
            <img src={heroVilla} alt="Accommodatie" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />
            <div className="relative z-10 px-6 py-8 w-full">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-extrabold text-white">Accommodatie wensen</h3>
              </div>
              <p className="text-white/50 text-sm mt-1">Wat moet de accommodatie minimaal bieden?</p>
            </div>
          </div>

          <div className="bg-background px-6 py-6 space-y-5">
            <div className="space-y-3">
              {[
                { checked: requireFixedBeds, onChange: setRequireFixedBeds, label: "Minimaal 6 vaste bedden", desc: "Geen slaapbanken of luchtbedden" },
                { checked: requireBedrooms3, onChange: setRequireBedrooms3, label: "Minimaal 3 slaapkamers", desc: "Privé slaapruimte voor iedereen" },
                { checked: requireTransparentPrice, onChange: setRequireTransparentPrice, label: "Transparante prijs", desc: "Geen verborgen kosten of toeristenbelasting-verrassingen" },
                { checked: requirePool, onChange: setRequirePool, label: "Zwembad", desc: "Privé of gedeeld zwembad bij de accommodatie" },
                { checked: requireAirco, onChange: setRequireAirco, label: "Airconditioning", desc: "In april kan het al warm zijn aan de Costa del Sol" },
                { checked: requireWifi, onChange: setRequireWifi, label: "Goede wifi", desc: "Betrouwbare internetverbinding" },
                { checked: requireParking, onChange: setRequireParking, label: "Parkeerplaats", desc: "Eigen parkeerplek bij de accommodatie" },
                { checked: requireTerrace, onChange: setRequireTerrace, label: "Terras / buitenruimte", desc: "Plek om buiten te zitten en te ontspannen" },
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                  <Checkbox checked={item.checked} onCheckedChange={(c) => !isDisabled && item.onChange(!!c)} disabled={isDisabled} className="mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold block">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Budget cap (optioneel)</p>
              <Input type="number" value={budgetCap} onChange={e => setBudgetCap(e.target.value)} placeholder="Max totaalprijs in EUR" className="h-11" disabled={isDisabled} />
            </div>
          </div>
        </section>

        {/* Block C — Over jou */}
        <section className="bg-background px-6 py-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-display font-extrabold text-sm text-primary-foreground">C</div>
            <h3 className="font-display font-extrabold text-base">Over jou</h3>
          </div>

          {/* Eetvoorkeuren */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-primary" />
              <h4 className="font-display font-extrabold text-sm">Eetvoorkeuren</h4>
            </div>
            <p className="text-muted-foreground text-xs">Vink aan wat op jou van toepassing is.</p>
            <div className="space-y-2">
              {[
                { value: "vegetarian", label: "Vegetarisch", desc: "Geen vlees of vis" },
                { value: "no_pork", label: "Geen varkensvlees", desc: "" },
                { value: "allergies", label: "Voedselallergieën", desc: "Geef details in de opmerking" },
                { value: "self_cook", label: "Voorkeur zelf koken", desc: "Liever zelf koken dan uit eten" },
                { value: "eat_out", label: "Voorkeur uit eten", desc: "Liever restaurants dan zelf koken" },
                { value: "no_preference", label: "Geen voorkeur", desc: "Alles is prima" },
              ].map((item) => {
                const isChecked = dietPreferences.includes(item.value);
                return (
                  <label key={item.value} className="flex items-start gap-3 cursor-pointer p-3.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(c) => !isDisabled && setDietPreferences(prev => c ? [...prev, item.value] : prev.filter(v => v !== item.value))}
                      disabled={isDisabled}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-semibold block">{item.label}</span>
                      {item.desc && <span className="text-xs text-muted-foreground">{item.desc}</span>}
                    </div>
                  </label>
                );
              })}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Opmerkingen eten</p>
              <Textarea value={dietRemarks} onChange={e => setDietRemarks(e.target.value)} placeholder="Bijv. allergieën, intoleranties..." className="min-h-[60px]" disabled={isDisabled} />
            </div>
          </div>

          {/* Activiteiten naast golf */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <h4 className="font-display font-extrabold text-sm">Activiteiten naast golf</h4>
            </div>
            <p className="text-muted-foreground text-xs">Wat zou je naast golf nog willen doen? (meerdere mogelijk)</p>
            <div className="space-y-2">
              {[
                { value: "beach", label: "Strand / zwemmen" },
                { value: "padel", label: "Padel" },
                { value: "spa", label: "Spa / wellness" },
                { value: "hiking", label: "Wandelen / natuur" },
                { value: "nightlife", label: "Uitgaan / nachtleven" },
                { value: "sightseeing", label: "Bezienswaardigheden / cultuur" },
                { value: "shopping", label: "Winkelen" },
                { value: "relaxing", label: "Gewoon relaxen" },
              ].map((item) => {
                const isChecked = activities.includes(item.value);
                return (
                  <label
                    key={item.value}
                    className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all ${isChecked ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(c) => !isDisabled && setActivities(prev => c ? [...prev, item.value] : prev.filter(v => v !== item.value))}
                      disabled={isDisabled}
                      className="mt-0.5"
                    />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Opmerkingen */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h4 className="font-display font-extrabold text-sm">Opmerkingen</h4>
            </div>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Heb je nog iets toe te voegen? Wensen, zorgen, ideeën..." className="min-h-[80px]" disabled={isDisabled} />
          </div>
        </section>

        {/* Block D — Dilemma keuzes */}
        <section className="bg-foreground text-background px-6 py-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-display font-extrabold text-sm text-white">D</div>
            <h3 className="font-display font-extrabold text-base text-white">Wat vind jij belangrijk?</h3>
          </div>
          <p className="text-white/50 text-sm">Kies steeds wat je belangrijker vindt. Na 15 keuzes berekenen we jouw puntenverdeling.</p>

          <DilemmaGame
            onComplete={(pts) => {
              setPoints({
                golfEase: pts.golfEase ?? 0,
                beachLife: pts.beachLife ?? 0,
                exploring: pts.exploring ?? 0,
                luxury: pts.luxury ?? 0,
                budget: pts.budget ?? 0,
                lowHassle: pts.lowHassle ?? 0,
              });
            }}
            initialPoints={existingId ? points : undefined}
          />
        </section>

        {/* Submit */}
        <div className="px-6 py-6 bg-background">
          <Button onClick={handleSubmit} disabled={submitting || isDisabled} className="w-full h-14 font-bold text-base" size="lg">
            {isPastDeadline ? "Deadline verstreken" : submitting ? "Opslaan..." : "Opslaan & locken"}
          </Button>
        </div>

        {/* Fun popup */}
        <Dialog open={showEdPopup} onOpenChange={setShowEdPopup}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{edPopupMessage.includes("ED") ? "🤨" : "🏌️"}</DialogTitle>
              <DialogDescription className="text-base font-semibold mt-2">
                {edPopupMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogClose asChild>
              <Button variant="outline" className="mt-2">OK</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
