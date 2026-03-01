import { AppLayout } from "@/components/AppLayout";
import heroCoast from "@/assets/hero-costa-del-sol.jpg";
import heroGolf from "@/assets/hero-golf.jpg";
import heroBeach from "@/assets/hero-beach-town.jpg";
import heroVilla from "@/assets/hero-villa.jpg";
import { Car, MapPin, Clock, Users, Calendar, CircleDot, ChevronRight } from "lucide-react";

export default function Info() {
  return (
    <AppLayout>
      <div className="-mx-4 -mt-6 space-y-0">
        {/* Hero */}
        <section className="relative h-[50vh] min-h-[320px] flex items-end">
          <img src={heroCoast} alt="Costa del Sol kustlijn" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative z-10 px-6 pb-8">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-[0.2em] mb-2">2 – 5 april 2026</p>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white leading-tight">
              5 man. 1 verblijf.<br />3 nachten Costa del Sol.
            </h1>
            <p className="text-white/70 text-sm mt-3 leading-relaxed max-w-md">
              We kiezen samen het beste verblijf voor golf, strand en goed eten.
              Iedereen geeft aan wat belangrijk is, de app doet de rest.
            </p>
          </div>
        </section>

        {/* Vaste gegevens */}
        <section className="bg-foreground text-background px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-5">Vaste gegevens</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50 flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Reis</span>
              <span className="font-semibold text-white">2 – 5 april 2026 (3 nachten)</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50 flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Groep</span>
              <span className="font-semibold text-white">5 volwassenen</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50">Vlucht ochtend</span>
              <span className="font-semibold text-white">Robin, Mark, Dimitri</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50">Vlucht middag</span>
              <span className="font-semibold text-white">Edwin, Hans</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Golf</span>
              <span className="font-semibold text-white">Min. 2x, max 3x 18 holes (La Cala Golf)</span>
            </div>
          </div>
          <p className="text-white/40 text-xs mt-5 leading-relaxed">
            Deze gegevens staan vast. In stap 1 bevestig je dat je hiermee akkoord bent.
          </p>
        </section>

        {/* Hoe werkt het - 3 stappen */}
        <section className="px-6 py-10 bg-background">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Hoe werkt het</p>
          <h2 className="font-display text-xl font-extrabold mb-8">In 3 stappen naar een keuze</h2>

          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center font-display font-extrabold text-background text-sm shrink-0">1</div>
              <div>
                <h3 className="font-display font-extrabold text-base">Gegevens bevestigen en must-haves aangeven</h3>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  Akkoord met de vaste reisgegevens. Daarna geef je je harde eisen aan:
                  minimaal aantal slaapkamers, vaste bedden, maximale reistijd naar de golfbaan,
                  annuleringsbeleid en budget. Verblijven die hier niet aan voldoen vallen direct af.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-display font-extrabold text-primary-foreground text-sm shrink-0">2</div>
              <div>
                <h3 className="font-display font-extrabold text-base">Voorkeuren verdelen</h3>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  Je verdeelt 100 punten over 6 factoren: golf gemak, strand en avondleven,
                  omgeving verkennen, comfort, budget en minimaal gedoe. De gemiddelde verdeling van
                  de groep bepaalt hoe zwaar elk criterium meetelt in de ranking.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-display font-extrabold text-foreground text-sm shrink-0">3</div>
              <div>
                <h3 className="font-display font-extrabold text-base">Definitieve check en boeken</h3>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  De top 3 wordt handmatig gecheckt op actuele beschikbaarheid, exacte all-in prijs,
                  en praktische zaken. Daarna kiezen we samen en boeken.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Locatie split: bij de golfbaan vs bij strand/dorp */}
        <section className="relative h-[44vh] min-h-[300px]">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 relative overflow-hidden">
              <img src={heroGolf} alt="Golfbaan La Cala" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <h3 className="font-display font-extrabold text-lg text-white">Bij de golfbaan</h3>
                <div className="mt-3 space-y-1.5 text-white/70 text-xs leading-relaxed">
                  <p className="flex items-center justify-center gap-1.5">
                    <CircleDot className="h-3 w-3 text-primary" /> La Cala Golf: 5 min
                  </p>
                  <p className="flex items-center justify-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Strand/dorp: 10 – 15 min rijden
                  </p>
                  <p className="flex items-center justify-center gap-1.5">
                    <Clock className="h-3 w-3" /> Restaurants: beperkt ter plekke
                  </p>
                </div>
              </div>
            </div>
            <div className="w-1/2 relative overflow-hidden">
              <img src={heroBeach} alt="La Cala de Mijas" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <h3 className="font-display font-extrabold text-lg text-white">Bij strand en dorp</h3>
                <div className="mt-3 space-y-1.5 text-white/70 text-xs leading-relaxed">
                  <p className="flex items-center justify-center gap-1.5">
                    <MapPin className="h-3 w-3 text-primary" /> Strand en restaurants: lopend
                  </p>
                  <p className="flex items-center justify-center gap-1.5">
                    <CircleDot className="h-3 w-3" /> La Cala Golf: 10 – 15 min rijden
                  </p>
                  <p className="flex items-center justify-center gap-1.5">
                    <Clock className="h-3 w-3" /> Winkels/centrum: lopend
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vervoer */}
        <section className="bg-foreground text-background px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-2">Vervoer</p>
          <h2 className="font-display text-xl font-extrabold text-white mb-6">Busje of taxi</h2>

          <div className="space-y-4">
            {/* Busje */}
            <div className="border border-white/10 rounded-xl p-5">
              <h3 className="font-display font-extrabold text-sm text-white mb-3">Busje huren (9-zits)</h3>
              <div className="space-y-0 text-xs">
                {[
                  ["Huur 9-zits busje, 3 dagen", "€200 – €350"],
                  ["Verzekering (CDW + all-risk)", "€40 – €80"],
                  ["Brandstof geschat", "€25 – €40"],
                ].map(([label, price], i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white font-medium">{price}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2">
                  <span className="text-white/60 font-semibold">Totaal</span>
                  <span className="text-primary font-bold">€265 – €470 (€53 – €94 p.p.)</span>
                </div>
              </div>
              <p className="text-white/20 text-[10px] mt-2">rental24h.com, KAYAK, momondo — 9-zits, april, Malaga Airport</p>
            </div>

            {/* Taxi */}
            <div className="border border-white/10 rounded-xl p-5">
              <h3 className="font-display font-extrabold text-sm text-white mb-3">Taxi / privétransfer</h3>
              <div className="space-y-0 text-xs">
                {[
                  ["Airport → La Cala de Mijas (5-7 pers.)", "€70 – €85"],
                  ["Airport → Fuengirola (5-7 pers.)", "€50 – €65"],
                  ["Lokale rit 10-15 min (1-4 pers.)", "€12 – €20"],
                ].map(([label, price], i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white font-medium">{price}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2">
                  <span className="text-white/60 font-semibold">Geschat weekend (2x airport + 5 lokaal)</span>
                  <span className="text-primary font-bold">€200 – €340 (€40 – €68 p.p.)</span>
                </div>
              </div>
              <p className="text-white/20 text-[10px] mt-2">malagaairporttaxi.net, kiwitaxi.com — vaste tarieven 2025</p>
            </div>
          </div>
        </section>

        {/* Harde eisen die we checken */}
        <section className="relative">
          <img src={heroVilla} alt="Terras met uitzicht" className="w-full h-56 object-cover" />
          <div className="px-6 py-8 bg-background">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Waar letten we op</p>
            <h2 className="font-display text-xl font-extrabold mb-5">Harde eisen per verblijf</h2>
            <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
              Bij elke accommodatie controleren we onderstaande punten.
              Als de meerderheid van de groep een eis aanvinkt, valt elk verblijf dat niet voldoet automatisch af.
            </p>
            <ul className="space-y-3">
              {[
                "Minimaal 3 slaapkamers voor 5 volwassenen",
                "Vaste bedden voor iedereen (geen slaapbanken)",
                "All-in prijs bevestigd: huur, schoonmaak, toeristenbelasting, borg",
                "Gratis annulering (geen non-refundable tenzij iedereen akkoord)",
                "Maximale reistijd naar La Cala Golf (jij bepaalt hoeveel minuten)",
                "Budget plafond per persoon (optioneel)",
              ].map((item, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-foreground text-background px-6 py-8 text-center">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Klaar?</p>
          <h2 className="font-display text-lg font-extrabold text-white mb-2">
            Vul de intake in en we gaan van start
          </h2>
          <p className="text-white/50 text-sm">
            Duurt 2 minuten. Daarna zie je direct de verblijven en ranking.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
