import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { ProductButtons } from "@/components/ProductButtons";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExpenseWizard, type WizardResult } from "@/features/together/ExpenseWizard";
import { GUEST_SELF_ID, addGuestExpense, addGuestPerson, guestUsesLeft, loadGuestKnaakie, saveGuestKnaakie } from "@/features/knaakie-guest/store";
import heroHome from "@/assets/hero-home.jpg";
import logo from "@/assets/vakansie_primary_complete.png.asset.json";

const FAQ = [
  {
    q: "Wat kost Vakansie?",
    a: "Je kiest: gratis of Pro. Gratis is één actieve reis, 5 documenten per reis en 12 Hansie-vragen per dag. Pro is een eenmalige bijdrage van € 2, € 5 of € 10 en geeft meer ruimte. Beide opties hebben dezelfde functies.",
  },
  {
    q: "Wat is Pro precies?",
    a: "Een eenmalige bijdrage van € 2, € 5 of € 10, naar wat je graag wilt bijdragen. Je krijgt onbeperkt reizen, 200 documenten per reis en 150 Hansie-vragen per dag. Geen abonnement en geen automatische verlenging.",
  },
  {
    q: "Boekt Vakansie mijn vakantie?",
    a: "Nee. Je boekt zelf bij de maatschappij, het hotel of de verhuurder van je keuze. Vakansie is de plek waar alles rond die boekingen samenkomt: je plan, je documenten, je taken en je kosten.",
  },
  {
    q: "Werkt Vakansie voor elke bestemming?",
    a: "Ja. Bos, stad, zon, festival of roadtrip. Je vult zelf in waar je heen gaat en wat je wilt regelen. Vakansie gaat uit van jouw reis, niet van een vast template.",
  },
  {
    q: "Kan ik ook alleen reizen?",
    a: "Ja. Een reis maken kan zonder iemand uit te nodigen. Je hebt dan één plek met je planning, je documenten en het overzicht over wat er nog moet.",
  },
  {
    q: "Hoeveel reisgenoten kunnen er mee?",
    a: "Onbeperkt, ook zonder Pro. Iedereen ziet dezelfde stand van zaken en kan zelf instellen welke meldingen hij of zij wil krijgen.",
  },
  {
    q: "Hoe werkt Knaakie met bonnetjes?",
    a: "Open Knaakie en maak een foto van een kassabon of een handgeschreven briefje. Zonder account kun je 10 uitgaven gratis toevoegen; maak je daarna een account, dan gaan je kosten mee. AI ontcijfert het bedrag en, als die erop staat, de datum. Jij controleert het voorstel, kiest wie betaalde en slaat het op. De foto wordt nergens bewaard. Daarna zie je per persoon wie wie moet betalen en stuur je een betaalverzoek met je eigen rekeningnummer.",
  },
  {
    q: "Wat kan Hansie?",
    a: "Hansie kent je reis en de wensen van je reisgenoten. Je vraagt wat er morgen op de planning staat, welke uitjes bij jullie passen, of wat er nog geregeld moet worden.",
  },
  {
    q: "Werkt Vakansie op mijn telefoon?",
    a: "Ja. Vakansie is eerst op je telefoon gemaakt en werkt ook op je tablet of laptop. Je hebt geen app nodig; je opent het in de browser.",
  },
  {
    q: "Kan ik een reis weghalen?",
    a: "Je archiveert een reis. Archiveren verwijdert niets: een gearchiveerde reis staat apart op je overzicht en kun je later weer terugzetten.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [guest, setGuest] = useState(() => loadGuestKnaakie());
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [file, setFile] = useState<File>();
  const [initialStep, setInitialStep] = useState<"start" | "amount">("start");
  const gallery = useRef<HTMLInputElement>(null);
  const left = guestUsesLeft(guest);

  const selectPhoto = (selected?: File) => {
    if (!selected) return;
    setFile(selected); setInitialStep("start"); setOpen(true);
  };
  const save = (result: WizardResult) => {
    const updated = addGuestExpense(guest, result);
    saveGuestKnaakie(updated);
    setGuest(updated);
    navigate("/knaakie");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-card text-foreground">
      <header className="mx-auto flex h-16 max-w-2xl items-center justify-between px-6">
        {logoFailed ? <span className="font-display text-3xl font-bold">Vakansie</span> : <img src={logo.url} alt="Vakansie" width={169} height={43} onError={() => setLogoFailed(true)} className="h-8 w-auto object-contain" />}
      </header>

      <main className="mx-auto max-w-2xl">
        <section className="relative px-6 pb-8 pt-8">
          <img src={heroHome} alt="Terras met uitzicht op zee" width={1280} height={720} className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-foreground/60" />
          <div className="relative">
            <h1 className="mb-8 max-w-md font-display text-4xl font-bold leading-tight text-on-image sm:text-5xl">Jouw hele vakantie in je broekzak</h1>
            <ProductButtons knaakieTo="/knaakie" vakansieTo="/signup" scanUnavailable={left === 0}
              onScan={() => { if (left === 0) navigate("/signup"); else gallery.current?.click(); }}
              onManual={() => { setFile(undefined); setInitialStep("amount"); setOpen(true); }} />
          </div>
        </section>
        <input ref={gallery} aria-label="Kies bonfoto op Home" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { selectPhoto(e.target.files?.[0]); e.target.value = ""; }} />

        <section className="bg-background px-6 py-7">
          <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
            <h2>
              <CollapsibleTrigger asChild>
                <Button variant="secondary" className="min-h-16 w-full justify-between rounded-lg bg-card px-4 text-left font-display text-2xl font-bold">
                  Goed om te weten<ChevronDown aria-hidden className={`!size-5 ${infoOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </h2>
            <CollapsibleContent>
          <Accordion type="single" collapsible className="mt-4 space-y-2">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="rounded-lg border border-border bg-card px-4">
                <AccordionTrigger className="min-h-14 gap-3 py-4 text-left text-base font-semibold hover:no-underline">{item.q}</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
            </CollapsibleContent>
          </Collapsible>
        </section>
      </main>

      <footer className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] text-sm text-muted-foreground">
        <span>Vakansie</span>
        <nav aria-label="Informatie" className="flex gap-4"><Link to="/steun" className="py-3 hover:text-foreground">Gratis en Pro</Link><Link to="/privacy" className="py-3 hover:text-foreground">Privacy</Link><Link to="/terms" className="py-3 hover:text-foreground">Voorwaarden</Link></nav>
      </footer>

      <ExpenseWizard open={open} onOpenChange={(value) => { setOpen(value); if (!value) setFile(undefined); }} initialFile={file} initialStep={initialStep} tripId={null} people={guest.people} selfId={GUEST_SELF_ID} defaultCurrency={guest.expenses[0]?.currency || "EUR"}
        onAddPerson={(name) => setGuest((current) => { const updated = addGuestPerson(current, name); saveGuestKnaakie(updated); return updated; })} onSave={save} />
    </div>
  );
}
