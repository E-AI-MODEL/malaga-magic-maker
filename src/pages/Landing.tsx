import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Info } from "lucide-react";
import { ProductButtons } from "@/components/ProductButtons";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ExpenseWizard, type WizardResult } from "@/features/together/ExpenseWizard";
import { GUEST_SELF_ID, addGuestExpense, addGuestPerson, guestUsesLeft, loadGuestKnaakie, saveGuestKnaakie } from "@/features/knaakie-guest/store";
import heroHome from "@/assets/hero-home.jpg";
import { BrandLogo } from "@/components/BrandLogo";

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
    <div className="relative h-[100dvh] overflow-hidden bg-foreground text-foreground">
      <img src={heroHome} alt="Terras met uitzicht op zee" width={1280} height={720} className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/10 to-foreground/40" />
      <main className="relative mx-auto flex h-full max-w-2xl flex-col px-5 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)]">
        <header className="flex h-12 shrink-0 items-center">
          <BrandLogo onImage />
        </header>
        <div className="flex min-h-0 flex-1 flex-col [justify-content:safe_center] gap-[2dvh]">
          <h1 className="mx-auto max-w-md text-center font-display text-[clamp(1.75rem,5.5dvh,3.75rem)] font-bold leading-[1.05] text-on-image drop-shadow-md">Jouw hele vakantie in je <span className="relative inline-block">broekzak<span aria-hidden className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-primary" /></span></h1>
          <ProductButtons knaakieTo="/knaakie" vakansieTo="/signup" scanUnavailable={left === 0}
            onScan={() => { if (left === 0) navigate("/signup"); else gallery.current?.click(); }}
            onManual={() => { setFile(undefined); setInitialStep("amount"); setOpen(true); }} />
          <Button variant="ghost" onClick={() => setInfoOpen(true)} className="tile-plain min-h-[min(4rem,9dvh)] w-full shrink-0 justify-between rounded-[1.5rem] px-4 text-left text-lg font-bold hover:bg-card">
            <span className="flex items-center gap-3"><Info aria-hidden className="!size-6" />Goed om te weten</span><ArrowRight aria-hidden className="!size-5" />
          </Button>
        </div>
        <nav aria-label="Informatie" className="flex shrink-0 justify-center gap-5 text-xs font-medium text-on-image/80"><Link to="/steun" className="py-2">Gratis en Pro</Link><Link to="/privacy" className="py-2">Privacy</Link><Link to="/terms" className="py-2">Voorwaarden</Link></nav>
      </main>
      <input ref={gallery} aria-label="Kies bonfoto op Home" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { selectPhoto(e.target.files?.[0]); e.target.value = ""; }} />

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-2xl overflow-y-auto rounded-t-2xl px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-8">
          <SheetHeader className="text-left"><SheetTitle className="font-display text-3xl">Goed om te weten</SheetTitle><SheetDescription className="sr-only">Veelgestelde vragen</SheetDescription></SheetHeader>
          <Accordion type="single" collapsible className="mt-4 space-y-2">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="rounded-lg border border-border bg-card px-4">
                <AccordionTrigger className="min-h-14 gap-3 py-4 text-left text-base font-semibold hover:no-underline">{item.q}</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SheetContent>
      </Sheet>

      <ExpenseWizard open={open} onOpenChange={(value) => { setOpen(value); if (!value) setFile(undefined); }} initialFile={file} initialStep={initialStep} tripId={null} people={guest.people} selfId={GUEST_SELF_ID} defaultCurrency={guest.expenses[0]?.currency || "EUR"}
        onAddPerson={(name) => setGuest((current) => { const updated = addGuestPerson(current, name); saveGuestKnaakie(updated); return updated; })} onSave={save} />
    </div>
  );
}
