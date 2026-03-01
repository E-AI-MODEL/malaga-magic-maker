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

        {/* Locatie accommodatie */}
        <section className="relative h-[44vh] min-h-[300px]">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 relative overflow-hidden">
              <img src={heroGolf} alt="Golfbaan La Cala" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <p className="text-white/40 text-[10px] font-semibold uppercase tracking-[0.2em] mb-2">Locatie accommodatie</p>
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
        <section className="bg-foreground text-background px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-5">Vervoer</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-white/40 mb-1">Busje huren (9-zits)</p>
              <p className="text-white font-semibold">€265 – €470 totaal</p>
              <p className="text-white/30">€53 – €94 p.p.</p>
            </div>
            <div>
              <p className="text-white/40 mb-1">Taxi / privétransfer</p>
              <p className="text-white font-semibold">€200 – €340 totaal</p>
              <p className="text-white/30">€40 – €68 p.p.</p>
            </div>
          </div>
          <p className="text-white/20 text-[10px] mt-4">Incl. verzekering & brandstof (busje) of 2x airport + ~5 lokale ritten (taxi). Bronnen: rental24h, KAYAK, kiwitaxi — april 2025.</p>
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
