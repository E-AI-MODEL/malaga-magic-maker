import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Heart,
  Route,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/primitives";
import heroHome from "@/assets/hero-home.jpg";
import logo from "@/assets/vakansie-logo.png";

const FEATURES = [
  {
    icon: Route,
    title: "Alles op één tijdlijn",
    body: "Vluchten, verblijf, vervoer en activiteiten achter elkaar, zodat je in één blik ziet hoe de reis loopt.",
  },
  {
    icon: Users,
    title: "Samen regelen",
    body: "Taken verdelen, knopen doorhakken en kosten eerlijk splitsen met iedereen die meegaat.",
  },
  {
    icon: FileText,
    title: "Documenten bij de hand",
    body: "Tickets, bevestigingen en vouchers veilig bewaard bij de reis waar ze bij horen.",
  },
  {
    icon: Sparkles,
    title: "Hansie denkt mee",
    body: "Vraag wat er nog mist. Hansie kijkt alleen in jouw reis en verzint nooit een boeking.",
  },
];

const STEPS = [
  { title: "Start je reis", body: "Een naam is genoeg. Data en bestemming vul je later aan." },
  { title: "Nodig je reisgenoten uit", body: "Iedereen ziet dezelfde stand van zaken, zonder eindeloze appgroep." },
  { title: "Werk rustig toe naar vertrek", body: "Vakansie houdt bij wat geregeld is en wat nog aandacht vraagt." },
];

const FAQ = [
  {
    q: "Is Vakansie echt gratis?",
    a: "Ja. Je kunt een volledige reis van begin tot vertrek voorbereiden zonder te betalen. Wil je het project steunen, dan kan dat vrijwillig.",
  },
  {
    q: "Moeten mijn reisgenoten ook betalen?",
    a: "Nee. Wie je uitnodigt reist gratis mee en heeft geen eigen abonnement nodig.",
  },
  {
    q: "Boekt Vakansie mijn vakantie?",
    a: "Nee. Je boekt zelf waar je wilt. Vakansie is de plek waar alles rond die boekingen samenkomt.",
  },
  {
    q: "Zijn mijn documenten veilig?",
    a: "Tickets en bevestigingen staan in afgeschermde opslag en zijn alleen zichtbaar voor de reizigers van die reis.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-none">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <span className="flex items-center gap-2">
            <img src={logo} alt="" width={28} height={28} className="h-7 w-7 rounded-[8px] object-cover" />
            <span className="font-brand text-[19px] font-semibold">Vakansie</span>
          </span>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/login">Inloggen</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20">
        <section className="mt-6">
          <div className="relative -mx-5 overflow-hidden sm:mx-0 sm:rounded-[18px]">
            <img
              src={heroHome}
              alt="Terras met uitzicht op zee en een reisnotitieboek"
              width={1280}
              height={720}
              className="h-[260px] w-full object-cover sm:h-[320px]"
            />
            <div aria-hidden className="absolute inset-0 bg-foreground/50" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                Voorbereiden zonder gedoe
              </p>
              <h1 className="mt-2 font-brand text-[30px] font-semibold leading-[1.12] text-white sm:text-[38px]">
                Je hele vakantie geregeld op één rustige plek
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
                Geen losse appjes, mails en screenshots meer. Vakansie brengt je reisplan, taken, kosten en
                documenten samen — voor jezelf of voor de hele groep.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg" className="w-full rounded-full sm:w-auto">
              <Link to="/signup">
                Gratis beginnen
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full rounded-full sm:w-auto">
              <Link to="/login">Ik heb al een account</Link>
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Gratis te gebruiken. Geen creditcard, geen abonnement.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-brand text-[24px] font-semibold leading-tight">Wat je ermee doet</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <Surface key={feature.title} className="p-4">
                <feature.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                <h3 className="mt-3 font-display text-[15px] font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </Surface>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-brand text-[24px] font-semibold leading-tight">Zo werkt het</h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-[13px] font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="prijs" className="mt-12">
          <h2 className="font-brand text-[24px] font-semibold leading-tight">Wat kost het</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Vakansie is gratis. We bouwen het rustig verder uit en vragen er voorlopig niets voor.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Surface className="p-5">
              <p className="font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Vakansie
              </p>
              <p className="mt-2 font-brand text-[34px] font-semibold leading-none">Gratis</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {[
                  "Je volledige reis voorbereiden",
                  "Onbeperkt reisgenoten uitnodigen",
                  "Taken, keuzes en kosten",
                  "Documenten en Hansie",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-5 w-full rounded-full">
                <Link to="/signup">Gratis beginnen</Link>
              </Button>
            </Surface>

            <Surface className="p-5">
              <p className="font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Pro
              </p>
              <p className="mt-2 flex items-baseline gap-1.5 font-brand text-[34px] font-semibold leading-none">
                vanaf € 2
                <span className="font-sans text-[13px] font-normal text-muted-foreground">eenmalig</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Vind je Vakansie de moeite waard? Met een eenmalige bijdrage ontgrendel je Pro op je account
                en help je hosting, documentopslag en Hansie betalen. Geen abonnement, geen verlenging — en
                alle basisfuncties blijven voor iedereen gratis.
              </p>
              <Button asChild variant="outline" className="mt-5 w-full rounded-full">
                <Link to="/steun">
                  <Heart className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                  Pro ontgrendelen
                </Link>
              </Button>
            </Surface>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-brand text-[24px] font-semibold leading-tight">Veelgestelde vragen</h2>
          <dl className="mt-4 divide-y divide-border border-y border-border">
            {FAQ.map((item) => (
              <div key={item.q} className="py-4">
                <dt className="font-display text-[15px] font-semibold">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12 rounded-[18px] bg-primary px-5 py-8 text-primary-foreground">
          <h2 className="font-brand text-[26px] font-semibold leading-tight">Klaar om te beginnen?</h2>
          <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">
            Zet je volgende reis neer en bouw hem rustig op. Een naam is genoeg.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-5 w-full rounded-full sm:w-auto">
            <Link to="/signup">
              Gratis beginnen
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Vakansie</span>
          <span className="flex gap-4">
            <Link to="/login" className="hover:text-foreground">Inloggen</Link>
            <Link to="/signup" className="hover:text-foreground">Account maken</Link>
            <Link to="/steun" className="hover:text-foreground">Steunen</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
