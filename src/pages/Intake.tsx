import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Check, Plane, Car, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import heroGolf from "@/assets/hero-golf.jpg";
import heroTransport from "@/assets/hero-transport.jpg";
import heroBeachTown from "@/assets/hero-beach-town.jpg";

type ChoiceValue = string | number | boolean;

const EDWIN_USER_ID = "d08ef813-36ad-46bb-bd7d-d7dd36d8b3a8";

export default function Intake() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [locked, setLocked] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [agreedFacts, setAgreedFacts] = useState(false);
  const [preferredRounds, setPreferredRounds] = useState<2 | 3 | null>(null);
  const [remarksA, setRemarksA] = useState("");
  const [mobilityChoice, setMobilityChoice] = useState("neutral");
  const [baseChoice, setBaseChoice] = useState("neutral");
  const [maxTravelMinutes, setMaxTravelMinutes] = useState<10 | 15 | 20 | 30>(20);
  const [requireFixedBeds, setRequireFixedBeds] = useState(false);
  const [requireBedrooms3, setRequireBedrooms3] = useState(false);
  const [requireCancelable, setRequireCancelable] = useState(false);
  const [requireTransparentPrice, setRequireTransparentPrice] = useState(false);
  const [budgetCap, setBudgetCap] = useState("");
  const [remarksB, setRemarksB] = useState("");

  // Fun popups
  const [showEdPopup, setShowEdPopup] = useState(false);
  const [edPopupMessage, setEdPopupMessage] = useState("");

  const [points, setPoints] = useState({
    golfEase: 20, beachLife: 20, exploring: 20, luxury: 20, budget: 10, lowHassle: 10
  });
  const totalPoints = Object.values(points).reduce((a, b) => a + b, 0);
  const setPoint = (key: string, value: number) => {
    setPoints(prev => ({ ...prev, [key]: Math.max(0, Math.min(100, value)) }));
  };

  const isEdwin = user?.id === EDWIN_USER_ID;

  useEffect(() => {
    if (!user) return;
    supabase.from("submissions").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setExistingId(data.id);
        setLocked(data.locked);
        setAgreedFacts(data.agreed_facts);
        setPreferredRounds(data.preferred_rounds as 2 | 3);
        setRemarksA(data.remarks_a || "");
        setMobilityChoice(data.mobility_choice);
        setBaseChoice(data.base_choice);
        setMaxTravelMinutes(data.max_golf_minutes as 10 | 15 | 20 | 30);
        setRequireFixedBeds(data.require_fixed_beds);
        setRequireBedrooms3(data.require_bedrooms_3);
        setRequireCancelable(data.require_cancelable);
        setRequireTransparentPrice(data.require_transparent_price);
        setBudgetCap(data.budget_cap_total?.toString() || "");
        setRemarksB(data.remarks_b || "");
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
    if (isEdwin) {
      setEdPopupMessage("Ed, ik zei toch dat je hier niet op moest klikken?");
      setShowEdPopup(true);
      return;
    }
    setPreferredRounds(value);
  };

  const handleEddieClick = () => {
    if (!isEdwin) {
      setEdPopupMessage("HEET JIJ ED?!");
      setShowEdPopup(true);
      return;
    }
    // Edwin can choose via Eddie button — we'll just let him pick
    setPreferredRounds(null); // reset, or toggle
    toast.success("Goed zo Ed! Kies maar hoeveel rondes je wilt.");
  };

  const handleSubmit = async () => {
    if (!agreedFacts) { toast.error("Je moet akkoord gaan met de vaste gegevens"); return; }
    if (preferredRounds === null) { toast.error("Kies het aantal rondes golf"); return; }
    if (totalPoints !== 100) { toast.error(`Verdeel exact 100 punten (nu: ${totalPoints})`); return; }
    if (!user) return;
    setSubmitting(true);
    const payload = {
      user_id: user.id, agreed_facts: agreedFacts, preferred_rounds: preferredRounds,
      remarks_a: remarksA || null, mobility_choice: mobilityChoice, base_choice: baseChoice,
      max_golf_minutes: maxTravelMinutes, require_fixed_beds: requireFixedBeds,
      require_bedrooms_3: requireBedrooms3, require_cancelable: requireCancelable,
      require_transparent_price: requireTransparentPrice,
      budget_cap_total: budgetCap ? Number(budgetCap) : null, remarks_b: remarksB || null,
      points_golf_ease: points.golfEase, points_beach_life: points.beachLife,
      points_exploring: points.exploring, points_luxury: points.luxury,
      points_budget: points.budget, points_low_hassle: points.lowHassle, locked: true,
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

  // Dynamic travel label based on base choice
  const travelLabel = baseChoice === "golf"
    ? "Max reistijd strand / dorpje"
    : baseChoice === "beach"
      ? "Max reistijd golfbaan"
      : "Max reistijd";

  const RadioOption = ({ name, value, current, onChange, label }: { name: string; value: ChoiceValue; current: ChoiceValue; onChange: (v: any) => void; label: string }) => (
    <label className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all ${current === value ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} className="hidden" />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );

  const DarkRadioOption = ({ name, value, current, onChange, label }: { name: string; value: ChoiceValue; current: ChoiceValue; onChange: (v: any) => void; label: string }) => (
    <label className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all ${current === value ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/15"}`}>
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} className="hidden" />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );

  const pointLabels: Record<string, string> = {
    golfEase: "Golf gemak",
    beachLife: "Strand & avondleven",
    exploring: "Omgeving ontdekken",
    luxury: "Comfort & luxe",
    budget: "Budget laag houden",
    lowHassle: "Gemak & ontzorging",
  };

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

        {/* Block A — Vaste gegevens */}
        <section className="bg-foreground text-background px-6 py-8 space-y-5">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-display font-extrabold text-sm">A</div>
              <h3 className="font-display font-extrabold text-base text-white">Vaste gegevens</h3>
            </div>
          </div>

          {/* Uitleg vaste gegevens */}
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-3">
              <Plane className="h-4 w-4 mt-0.5 shrink-0 text-white/40" />
              <div>
                <p className="text-white/90 font-semibold">Vluchten</p>
                <p>Do-ochtend: Robin, Mark &amp; Dimitri</p>
                <p>Do-middag: Edwin &amp; Hans</p>
                <p>Zo-ochtend: Iedereen terug</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-white/40" />
              <div>
                <p className="text-white/90 font-semibold">Golf</p>
                <p>Minimaal 2 rondes 18 holes bij La Cala Golf</p>
              </div>
            </div>
            <p className="text-white/50 text-xs">2 – 5 april 2026 · 5 volwassenen</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={agreedFacts} onCheckedChange={(c) => setAgreedFacts(!!c)} className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
            <span className="text-sm text-white/80">Ik ga akkoord met de vaste gegevens</span>
          </label>

          {/* Rondes — enige dat nog niet vast staat */}
          <div className="border-t border-white/10 pt-5 space-y-3">
            <p className="text-sm text-white/70">
              Er staat nog <span className="text-white font-semibold">één ding</span> niet vast: hoeveel rondes golf we spelen. Dat bepaalt Edwin.
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Hoeveel rondes golf?</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleRoundsClick(2)}
                className={`p-3.5 rounded-lg text-sm font-semibold transition-all ${preferredRounds === 2 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/15"}`}
              >
                2 rondes
              </button>
              <button
                onClick={() => handleRoundsClick(3)}
                className={`p-3.5 rounded-lg text-sm font-semibold transition-all ${preferredRounds === 3 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/15"}`}
              >
                3 rondes
              </button>
              <button
                onClick={handleEddieClick}
                className="p-3.5 rounded-lg text-sm font-semibold transition-all bg-accent text-accent-foreground hover:bg-accent/80"
              >
                🏌️ Eddie de Caddy
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">Opmerking</p>
            <Textarea value={remarksA} onChange={e => setRemarksA(e.target.value)} placeholder="Optioneel..." className="bg-white/10 border-white/15 text-white placeholder:text-white/30 min-h-[60px]" />
          </div>
        </section>

        {/* Block B — Voorkeuren */}
        <section className="space-y-0">
          {/* Vervoer met hero foto */}
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
                <DarkRadioOption name="mobility" value="car" current={mobilityChoice} onChange={setMobilityChoice} label="Huurauto" />
                <DarkRadioOption name="mobility" value="transfers" current={mobilityChoice} onChange={setMobilityChoice} label="Transfers + taxi's" />
                <DarkRadioOption name="mobility" value="neutral" current={mobilityChoice} onChange={setMobilityChoice} label="Geen voorkeur" />
              </div>
            </div>
          </div>

          {/* Locatie accommodatie + max reistijd */}
          <div className="relative min-h-[320px] flex items-end">
            <img src={heroBeachTown} alt="Locatie" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/10" />
            <div className="relative z-10 px-6 py-8 w-full space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Locatie accommodatie</p>
              <div className="space-y-2">
                <DarkRadioOption name="base" value="golf" current={baseChoice} onChange={setBaseChoice} label="Bij de golfbaan (La Cala Golf)" />
                <DarkRadioOption name="base" value="beach" current={baseChoice} onChange={setBaseChoice} label="Bij het strand (La Cala / Calahonda)" />
                <DarkRadioOption name="base" value="neutral" current={baseChoice} onChange={setBaseChoice} label="Geen voorkeur" />
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mt-4">{travelLabel}</p>
              <div className="grid grid-cols-4 gap-2">
                {([10, 15, 20, 30] as const).map(v => (
                  <DarkRadioOption key={v} name="travelMin" value={v} current={maxTravelMinutes} onChange={setMaxTravelMinutes} label={`${v} min`} />
                ))}
              </div>
            </div>
          </div>

          {/* Accommodatie wensen */}
          <div className="bg-background px-6 py-8 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accommodatie wensen</p>

            <div className="space-y-3">
              {[
                { checked: requireFixedBeds, onChange: setRequireFixedBeds, label: "Minimaal 5 vaste bedden", desc: "Geen slaapbanken of luchtbedden" },
                { checked: requireBedrooms3, onChange: setRequireBedrooms3, label: "Minimaal 3 slaapkamers", desc: "Privé slaapruimte voor iedereen" },
                { checked: requireCancelable, onChange: setRequireCancelable, label: "Gratis annuleerbaar", desc: "Volledige terugbetaling bij annulering" },
                { checked: requireTransparentPrice, onChange: setRequireTransparentPrice, label: "Transparante prijs", desc: "Geen verborgen kosten of toeristenbelasting-verrassingen" },
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                  <Checkbox checked={item.checked} onCheckedChange={(c) => item.onChange(!!c)} className="mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold block">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Budget cap (optioneel)</p>
              <Input type="number" value={budgetCap} onChange={e => setBudgetCap(e.target.value)} placeholder="Max totaalprijs in EUR" className="h-11" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Opmerking</p>
              <Textarea value={remarksB} onChange={e => setRemarksB(e.target.value)} placeholder="Optioneel..." className="min-h-[60px]" />
            </div>
          </div>
        </section>

        {/* Block C — Punten */}
        <section className="bg-foreground text-background px-6 py-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-display font-extrabold text-sm text-white">C</div>
            <h3 className="font-display font-extrabold text-base text-white">100 punten verdelen</h3>
          </div>
          <p className="text-white/50 text-sm">Verdeel exact 100 punten over wat jij belangrijk vindt. Gebruik stappen van 5.</p>

          <div className={`text-center py-4 rounded-xl font-display text-3xl font-extrabold ${totalPoints === 100 ? "text-primary bg-primary/10" : "text-red-400 bg-red-400/10"}`}>
            {totalPoints}<span className="text-lg text-white/30 ml-1">/100</span>
          </div>

          {Object.entries(pointLabels).map(([key, label]) => {
            const val = points[key as keyof typeof points];
            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white/70">{label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPoint(key, val - 5)}
                      className="h-7 w-7 rounded-full bg-white/10 text-white/70 hover:bg-white/20 text-sm font-bold flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="font-display font-extrabold text-primary tabular-nums w-8 text-center">{val}</span>
                    <button
                      onClick={() => setPoint(key, val + 5)}
                      className="h-7 w-7 rounded-full bg-white/10 text-white/70 hover:bg-white/20 text-sm font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
                <Slider
                  value={[val]}
                  onValueChange={([v]) => setPoint(key, Math.round(v / 5) * 5)}
                  max={100} step={5}
                  className="py-1"
                />
              </div>
            );
          })}
        </section>

        {/* Submit */}
        <div className="px-6 py-6 bg-background">
          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-14 font-bold text-base" size="lg">
            {submitting ? "Opslaan..." : "Opslaan & locken"}
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
