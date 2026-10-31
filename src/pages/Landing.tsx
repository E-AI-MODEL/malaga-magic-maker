import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Heart,
  Plane,
  Route,
  Send,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import heroHome from "@/assets/hero-home.jpg";
import logo from "@/assets/vakansie_primary_complete.png.asset.json";

const FEATURES = [
  {
    icon: Route,
    title: "Alles op één tijdlijn",
    body: "Vluchten, verblijf, vervoer en activiteiten in de volgorde van je reis.",
  },
  {
    icon: Users,
    title: "Samen regelen",
    body: "Verdeel taken en stem over keuzes. Knaakie houdt bij wie wat betaalt, ook via een foto van je bonnetje.",
  },
  {
    icon: UserRound,
    title: "Ieder zijn wensen",
    body: "Leg per reiziger dieet, tempo, budget en prioriteiten vast.",
  },
  {
    icon: FileText,
    title: "Documenten bij de hand",
    body: "Tickets, bevestigingen en vouchers privé bewaard bij je reis.",
  },
  {
    icon: Bell,
    title: "Blijf op de hoogte",
    body: "Krijg een melding bij nieuwe taken, stemmen, documenten en reisupdates.",
  },
  {
    icon: Sparkles,
    title: "Hansie denkt mee",
    body: "Vraag om ideeën voor uitjes die passen bij jullie wensen, of hulp bij je planning.",
  },
];

const STEPS = [
  { title: "Start je reis", body: "Een naam is genoeg. Data en bestemming vul je later aan." },
  { title: "Nodig je reisgenoten uit", body: "Deel je uitnodiging. Ga je alleen? Dan sla je deze stap over." },
  { title: "Werk toe naar vertrek", body: "Voeg je boekingen toe en vink af wat geregeld is. Zo zie je wat nog aandacht vraagt." },
  {
    title: "Neem je reis mee",
    body: "Op locatie vraag je Hansie wat er vandaag op de planning staat of welk uitje bij jullie past. Je tickets zijn bij de hand. Bonnetjes fotografeer je met Knaakie, en na afloop zie je wie nog wat moet betalen.",
  },
];

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

const DOSSIER_ROWS = [
  { icon: Plane, title: "Heenvlucht", meta: "vr 12 jun · 07:15", state: "Geboekt" },
  { icon: Route, title: "Huis met zeezicht", meta: "12 – 19 jun · 6 personen", state: "Geboekt" },
  { icon: Wallet, title: "Knaakie", meta: "€ 1.240 · 6 reizigers", state: "Loopt" },
  { icon: FileText, title: "Tickets en vouchers", meta: "4 documenten", state: "Klaar" },
];

export default function Landing() {
  const [showBar, setShowBar] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <span className="flex items-center gap-2">
            <img src={logo.url} alt="Vakansie" width={169} height={43} className="h-8 w-auto object-contain" />
          </span>
          <Button asChild variant="ghost" size="sm" className="rounded-md">
            <Link to="/login">Inloggen</Link>
          </Button>
        </div>
      </header>

      <main className="pb-16">
        <section className="relative">
          <div className="relative h-[520px] w-full overflow-hidden sm:h-[540px]">
            <div
              aria-hidden
              className={`absolute inset-0 bg-secondary transition-opacity duration-700 ${heroLoaded ? "opacity-0" : "opacity-100"}`}
            />
            <img
              src={heroHome}
              alt="Terras met uitzicht op zee en een opengeslagen reisnotitieboek"
              width={1280}
              height={720}
              loading="eager"
              onLoad={() => setHeroLoaded(true)}
              className="h-full w-full object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-foreground/60" />
            <div className="absolute inset-x-0 top-0 mx-auto max-w-3xl px-5 pt-10">
              <p className="flex items-center gap-2.5 font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                <span aria-hidden className="h-px w-7 bg-white/40" />
                Voorbereiden zonder gedoe
              </p>
              <h1 className="mt-4 font-display text-[34px] font-bold uppercase tracking-wide leading-[1.08] text-white sm:text-[46px]">
                Je hele vakantie
                <br />
                in je broekzak
              </h1>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/90">
                Geen losse appjes, mails en screenshots meer. Reisplan, taken, kosten en documenten bij
                elkaar, voor jezelf of voor de hele groep.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-14 w-full rounded-xl px-8 font-display text-lg font-semibold sm:w-auto [&_svg]:size-5">
                  <Link to="/signup">
                    Gratis beginnen
                    <ArrowRight className="ml-2" />
                  </Link>
                </Button>
                <Link to="/login" className="text-center text-[15px] font-medium text-on-image underline-offset-4 hover:underline sm:px-4">
                  Ik heb al een account
                </Link>
              </div>
            </div>
          </div>

          <div className="relative z-10 mx-auto -mt-20 max-w-3xl px-5">
            <div className="rounded-[20px] border border-border bg-card p-4 shadow-soft">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-[17px] font-bold uppercase tracking-wide">Zomer aan de kust</p>
                <span className="shrink-0 font-ui text-[11px] font-semibold text-primary">nog 24 dagen</span>
              </div>
              <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-3/4 rounded-full bg-primary" />
              </div>
              <ul className="mt-1 rule-divide">
                {DOSSIER_ROWS.map((row) => (
                  <li key={row.title} className="flex items-center gap-3 py-2.5">
                    <row.icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium leading-tight">{row.title}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{row.meta}</span>
                    </span>
                    <span className="shrink-0 font-ui text-[11px] font-semibold text-muted-foreground">
                      {row.state}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {["Gratis te gebruiken", "Elke bestemming", "Privé per reis"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
                  {item}
                </span>
              ))}
            </p>
          </div>
        </section>

        <section aria-labelledby="knaakie-title" className="mx-auto mt-14 max-w-3xl px-5">
          <Link to="/knaakie" aria-label="Knaakie openen: foto van je bonnetje, kosten delen" className="block rounded-3xl transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Kosten delen
          </p>
          <h2 id="knaakie-title" className="mt-2 font-display text-[40px] font-bold uppercase tracking-wide leading-none">
            Knaakie
          </h2>
          <p className="mt-2 font-display text-[22px] font-bold leading-tight">
            Foto van je bonnetje. Klaar.
          </p>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Knaakie houdt bij wie wat betaalt: met vrienden, huisgenoten of op reis. Maak een foto van een kassabon of een handgeschreven
            briefje: AI ontcijfert het bedrag en de datum. Jij kijkt het na en slaat op. Probeer het
            meteen, zonder account.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-foreground px-5 pb-5 pt-6 text-background">
              <div className="flex items-center gap-2 font-ui text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
                <Camera className="h-4 w-4" strokeWidth={1.75} />
                Bonnetje ontcijferd
              </div>
              <div className="mt-4 rounded-2xl bg-background/10 p-4">
                <p className="text-[13px] opacity-70">Strandtent De Zon</p>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="text-[15px]">10 bier</span>
                  <span className="tabular font-display text-[30px] font-bold leading-none">€ 15,00</span>
                </div>
                <p className="mt-2 text-[12px] opacity-70">Betaald door jou · gedeeld door 6</p>
              </div>
              <div className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-lg font-semibold text-primary-foreground">
                <Check className="h-5 w-5" strokeWidth={2.25} />
                Opslaan
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Jij krijgt terug
              </p>
              <p className="tabular mt-2 font-display text-[40px] font-bold leading-none text-primary">€ 43,50</p>
              <ul className="mt-4 rule-divide">
                {[
                  { name: "Sanne", amount: "€ 21,75" },
                  { name: "Joris", amount: "€ 21,75" },
                ].map((row) => (
                  <li key={row.name} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-[15px] font-bold">
                      {row.name[0]}
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] font-medium">{row.name} betaalt jou</span>
                    <span className="tabular font-display text-[19px] font-bold">{row.amount}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-[15px] font-semibold">
                <Send className="h-4 w-4" strokeWidth={1.75} />
                Betaalverzoek sturen
              </div>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
            {[
              "Werkt met kassabonnen én handgeschreven briefjes",
              "Per persoon zie je meteen wie wie moet betalen",
              "Betaalverzoek met je eigen rekeningnummer, geld loopt niet via ons",
              "De foto wordt nergens bewaard",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <span className={`${buttonVariants({ size: "lg" })} mt-6 h-14 w-full rounded-xl px-8 font-display text-lg font-semibold sm:w-auto [&_svg]:size-5`}>
            <Camera className="mr-2" />
            Probeer Knaakie gratis
            <ArrowRight className="ml-2" />
          </span>
          <span className="mt-2 block text-xs text-muted-foreground">
            10 uitgaven gratis, zonder account. Maak je later een account, dan gaan je kosten mee.
          </span>
          </Link>
        </section>

        <section className="mx-auto mt-14 max-w-3xl px-5">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Wat je ermee doet
          </p>
          <h2 className="mt-2 font-display text-[26px] font-bold uppercase tracking-wide leading-tight">
            Van een goed idee naar een vakansie met Hansie
          </h2>
          <div className="mt-5 rule-divide border-t border-[hsl(var(--rule)/0.08)]">
            {FEATURES.map((feature, index) => (
              <div key={feature.title} className="flex gap-4 py-5">
                <div className="flex w-8 shrink-0 flex-col items-center">
                  <feature.icon className="h-5 w-5 text-primary" strokeWidth={1.6} />
                  <span className="tabular mt-2 font-ui text-[11px] font-semibold text-muted-foreground/60">
                    0{index + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-[19px] font-bold uppercase tracking-wide leading-snug">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 border-y border-border bg-secondary/60 py-12">
          <div className="mx-auto max-w-3xl px-5">
            <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Zo werkt het
            </p>
            <h2 className="mt-2 font-display text-[26px] font-bold uppercase tracking-wide leading-tight">In vier stappen</h2>
            <ol className="relative mt-6">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0">
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-[13px] top-[29px] w-px bg-[hsl(var(--rule)/0.14)]"
                    />
                  )}
                  <span className="relative z-10 mt-0.5 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border border-border bg-card font-ui text-[12px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-[18px] font-bold uppercase tracking-wide leading-snug">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="prijs" className="mx-auto mt-14 max-w-3xl px-5">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Wat kost het
          </p>
          <h2 className="mt-2 font-display text-[26px] font-bold uppercase tracking-wide leading-tight">
            Twee opties: gratis of Pro
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Beide opties hebben dezelfde functies. Het verschil zit in de ruimte.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-border bg-card p-5 shadow-soft">
              <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Gratis
              </p>
              <p className="mt-2 font-display text-[38px] font-bold uppercase tracking-wide leading-none">€ 0</p>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {[
                  "Eén actieve reis",
                  "Onbeperkt reisgenoten uitnodigen",
                  "Taken, keuzes en kosten",
                  "5 documenten per reis",
                  "12 Hansie-vragen per dag",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-5 w-full rounded-md">
                <Link to="/signup">Gratis beginnen</Link>
              </Button>
            </div>

            <div className="rounded-[20px] bg-primary p-5 text-primary-foreground">
              <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
                Pro · vrijwillig
              </p>
              <p className="mt-2 flex items-baseline gap-1.5 font-display text-[38px] font-bold uppercase tracking-wide leading-none">
                € 2
                <span className="font-sans text-[13px] font-normal text-primary-foreground/70">
                  eenmalig, ook € 5 of € 10
                </span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-primary-foreground/80">
                Eenmalige bijdrage, geen abonnement. Je krijgt meer ruimte bovenop alles wat gratis al kan.
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-primary-foreground/90">
                {[
                  "Onbeperkt reizen",
                  "200 documenten per reis",
                  "150 Hansie-vragen per dag",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="secondary" className="mt-5 w-full rounded-md">
                <Link to="/steun">
                  <Heart className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                  Pro ontgrendelen
                </Link>
              </Button>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Pro staat blijvend op je account. Geen abonnement, geen automatische verlenging.
          </p>
        </section>

        <section className="mx-auto mt-14 max-w-3xl px-5">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Goed om te weten
          </p>
          <h2 className="mt-2 font-display text-[26px] font-bold uppercase tracking-wide leading-tight">
            Veelgestelde vragen
          </h2>
          <Accordion
            type="single"
            collapsible
            className="mt-4 rule-divide border-t border-[hsl(var(--rule)/0.08)]"
          >
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="border-b-0">
                <AccordionTrigger className="py-4 text-left font-display text-[17px] font-bold uppercase tracking-wide leading-snug no-underline transition-colors hover:no-underline hover:text-primary">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mx-auto mt-14 max-w-3xl px-5">
          <div className="rounded-[20px] border border-border bg-card px-5 py-9 text-center shadow-soft">
            <h2 className="font-display text-[28px] font-bold uppercase tracking-wide leading-tight">Klaar om te beginnen?</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Begin met een naam. De rest vul je stap voor stap aan.
            </p>
            <Button asChild size="lg" className="mt-5 w-full rounded-md sm:w-auto sm:px-10">
              <Link to="/signup">
                Gratis beginnen
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-5 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 transition-transform duration-200 sm:hidden ${
          showBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-xs leading-tight text-muted-foreground">
            Gratis of Pro.
          </p>
          <Button asChild size="sm" className="shrink-0 rounded-md px-5">
            <Link to="/signup">Gratis beginnen</Link>
          </Button>
        </div>
      </div>

      <footer className="border-t border-border py-8 pb-24 sm:pb-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Vakansie</span>
          <span className="flex flex-wrap gap-4">
            <Link to="/login" className="hover:text-foreground">Inloggen</Link>
            <Link to="/signup" className="hover:text-foreground">Account maken</Link>
            <Link to="/steun" className="hover:text-foreground">Steunen</Link>
            <Link to="/terms" className="hover:text-foreground">Voorwaarden</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
