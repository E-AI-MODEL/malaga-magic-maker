import { AppLayout } from "@/components/AppLayout";
import heroCoast from "@/assets/hero-costa-del-sol.jpg";
import heroTransport from "@/assets/hero-transport.jpg";
import heroGolf from "@/assets/hero-golf.jpg";
import heroBeach from "@/assets/hero-beach-town.jpg";
import heroVilla from "@/assets/hero-villa.jpg";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, Calendar, CircleDot, ChevronRight, Plane, ArrowRight, ExternalLink, Car } from "lucide-react";

export default function Info() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="-mx-4 -mt-6">

        {/* ═══════════ HERO ═══════════ */}
        <section className="relative h-[50vh] min-h-[320px] flex items-end">
          <img src={heroCoast} alt="Costa del Sol kustlijn" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative z-10 px-6 pb-8">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-[0.2em] mb-2">2 – 5 april 2026</p>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white leading-tight">
              6 man. 1 verblijf.<br />3 nachten Costa del Sol.
            </h1>
            <p className="text-white/70 text-sm mt-3 leading-relaxed max-w-md">
              We kiezen samen het beste verblijf voor golf, strand en goed eten.
              Iedereen geeft aan wat belangrijk is, de app doet de rest.
            </p>
          </div>
        </section>

        {/* ═══════════ VASTE GEGEVENS ═══════════ */}
        <section className="bg-foreground text-white px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-5">Vaste gegevens</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50 flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Reis</span>
              <span className="font-semibold">2 – 5 april 2026 (3 nachten)</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50 flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Groep</span>
              <span className="font-semibold">6 volwassenen</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50 flex items-center gap-2"><Plane className="h-3.5 w-3.5" /> Heen do ochtend</span>
              <span className="font-semibold">Robin, Mark, Dimitri</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50 flex items-center gap-2"><Plane className="h-3.5 w-3.5" /> Heen do middag</span>
              <span className="font-semibold">Edwin, Hans</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50 flex items-center gap-2"><Plane className="h-3.5 w-3.5" /> Heen Pieter</span>
              <span className="font-semibold text-white/60 italic">(nog) onbekend</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50 flex items-center gap-2"><Plane className="h-3.5 w-3.5" /> Terug zo ochtend</span>
              <span className="font-semibold">Allen</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Golf</span>
              <span className="font-semibold">Min. 2x, max 3x 18 holes (La Cala Golf) <span className="italic text-white/40">(m.u.v. Pieter &amp; Edwin)</span></span>
            </div>
          </div>
          <p className="text-white/40 text-xs mt-5 leading-relaxed">
            Deze gegevens staan vast. In de intake bevestig je dat je hiermee akkoord bent.
          </p>
        </section>

        {/* ═══════════ NOG NIET VAST — INTRO ═══════════ */}
        <section className="px-6 py-10">
          <h2 className="font-display text-xl font-extrabold mb-1">Gegevens die nog niet vast staan</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Wordt bepaald op basis van jullie voorkeuren in de intake.
          </p>
        </section>

        {/* ═══════════ BLOK 1: VERVOER ═══════════ */}
        <section className="relative min-h-[420px] flex items-end">
          <img src={heroTransport} alt="Kustweg Costa del Sol" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/10" />
          <div className="relative z-10 px-6 py-8 w-full">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
              <Car className="h-3.5 w-3.5" /> 1 · Vervoer
            </p>
            <h2 className="font-display text-2xl font-extrabold text-white mb-6">Busje of taxi?</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Optie A */}
              <div className="rounded-lg border border-white/15 bg-white/5 backdrop-blur-sm p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-3">Optie A</p>
                <h3 className="font-display text-base font-bold text-white mb-1">9-zits busje</h3>
                <p className="text-lg font-extrabold text-white mb-3">€265 – €470<span className="text-xs font-normal text-white/40 ml-1">totaal</span></p>
                <div className="space-y-1 text-xs text-white/50">
                  <p>€44 – €78 p.p.</p>
                  <p>Incl. all-risk &amp; brandstof</p>
                  <p>Maximale flexibiliteit</p>
                </div>
              </div>
              {/* Optie B */}
              <div className="rounded-lg border border-white/15 bg-white/5 backdrop-blur-sm p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-3">Optie B</p>
                <h3 className="font-display text-base font-bold text-white mb-1">Taxi / transfer</h3>
                <p className="text-lg font-extrabold text-white mb-3">€200 – €340<span className="text-xs font-normal text-white/40 ml-1">totaal</span></p>
                <div className="space-y-1 text-xs text-white/50">
                  <p>€37 – €57 p.p.</p>
                  <p>2× airport transfer</p>
                  <p>~5 lokale ritten</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/25">
              <span>Bronnen:</span>
              <a href="https://www.rental24h.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50 inline-flex items-center gap-0.5">rental24h.com <ExternalLink className="h-2.5 w-2.5" /></a>
              <a href="https://www.kayak.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50 inline-flex items-center gap-0.5">KAYAK <ExternalLink className="h-2.5 w-2.5" /></a>
              <a href="https://www.kiwitaxi.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50 inline-flex items-center gap-0.5">kiwitaxi.com <ExternalLink className="h-2.5 w-2.5" /></a>
            </div>
          </div>
        </section>

        {/* ═══════════ SPACER ═══════════ */}
        <div className="h-10 bg-background" />

        {/* ═══════════ BLOK 2: LOCATIE ═══════════ */}
        <div className="flex flex-col md:flex-row">
          <div className="relative h-[340px] md:h-[400px] md:w-1/2">
            <img src={heroGolf} alt="Golfbaan La Cala" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">2 · Locatie optie A</p>
              <h3 className="font-display font-extrabold text-2xl text-white mb-5">Bij de golfbaan</h3>
              <div className="space-y-2 text-white/70 text-sm leading-relaxed">
                <p className="flex items-center justify-center gap-2">
                  <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" /> La Cala Golf: 5 min
                </p>
                <p className="flex items-center justify-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> Strand/dorp: 10 – 15 min rijden
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" /> Restaurants: beperkt ter plekke
                </p>
              </div>
            </div>
          </div>
          <div className="relative h-[340px] md:h-[400px] md:w-1/2">
            <img src={heroBeach} alt="La Cala de Mijas" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">2 · Locatie optie B</p>
              <h3 className="font-display font-extrabold text-2xl text-white mb-5">Bij strand en dorp</h3>
              <div className="space-y-2 text-white/70 text-sm leading-relaxed">
                <p className="flex items-center justify-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> Strand en restaurants: lopend
                </p>
                <p className="flex items-center justify-center gap-2">
                  <CircleDot className="h-3.5 w-3.5 shrink-0" /> La Cala Golf: 10 – 15 min rijden
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" /> Winkels/centrum: lopend
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ SPACER ═══════════ */}
        <div className="h-10 bg-background" />

        {/* ═══════════ BLOK 3: ACCOMMODATIE ═══════════ */}
        <section>
          <div className="relative h-[200px]">
            <img src={heroVilla} alt="Terras met uitzicht" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
          <div className="px-6 pb-8 -mt-8 relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">3 · Accommodatie</p>
            <h2 className="font-display text-xl font-extrabold mb-4">Harde eisen per verblijf</h2>
            <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
              Elk verblijf wordt getoetst op onderstaande punten. In de intake geef je aan welke voor jou een harde eis zijn — als de meerderheid een punt aanvinkt, valt elk verblijf dat niet voldoet af.
            </p>
            <ul className="space-y-3">
              {[
                "Minimaal 3 slaapkamers voor 6 volwassenen",
                "Vaste bedden voor iedereen (geen slaapbanken)",
                "All-in prijs bevestigd: huur, schoonmaak, toeristenbelasting, borg",
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

        {/* ═══════════ CTA ═══════════ */}
        <section className="bg-foreground px-6 py-10 text-center">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Klaar?</p>
          <h2 className="font-display text-lg font-extrabold text-white mb-2">
            Vul de intake in en we gaan van start
          </h2>
          <p className="text-white/50 text-sm mb-6">
            Duurt 2 minuten. Daarna zie je direct de verblijven en ranking.
          </p>
          <Button onClick={() => navigate("/intake")} size="lg" className="gap-2 font-bold">
            Start intake <ArrowRight className="h-4 w-4" />
          </Button>
        </section>

      </div>
    </AppLayout>
  );
}
