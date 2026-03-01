import { AppLayout } from "@/components/AppLayout";
import heroCoast from "@/assets/hero-costa-del-sol.jpg";
import heroGolf from "@/assets/hero-golf.jpg";
import heroBeach from "@/assets/hero-beach-town.jpg";
import heroVilla from "@/assets/hero-villa.jpg";

export default function Info() {
  return (
    <AppLayout>
      <div className="-mx-4 -mt-6 space-y-0">
        {/* Hero */}
        <section className="relative h-[50vh] min-h-[320px] flex items-end">
          <img src={heroCoast} alt="Costa del Sol" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative z-10 px-6 pb-8 max-w-lg">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-[0.2em] mb-2">April 2026</p>
            <h1 className="font-display text-3xl font-extrabold text-white leading-tight">
              1 verblijf.<br />5 man. 3 nachten.
            </h1>
            <p className="text-white/70 text-sm mt-3 leading-relaxed">
              Golf, strand, omgeving. We kiezen snel en boeken.
            </p>
          </div>
        </section>

        {/* 3 Rondes */}
        <section className="bg-foreground text-background px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-6">De Afvalrace</p>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center font-display font-extrabold text-white text-lg shrink-0">1</div>
              <div>
                <h3 className="font-display font-extrabold text-lg text-white">Sloperhamer</h3>
                <p className="text-white/60 text-sm mt-1 leading-relaxed">Kill criteria filtert alles dat niet kan. Bedden, kamers, annulering, reistijd – wat niet past vliegt eruit.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-display font-extrabold text-white text-lg shrink-0">2</div>
              <div>
                <h3 className="font-display font-extrabold text-lg text-white">Scorebord</h3>
                <p className="text-white/60 text-sm mt-1 leading-relaxed">Jullie punten bepalen de ranking. Golf gemak, strand, budget – de top stijgt.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-display font-extrabold text-white text-lg shrink-0">3</div>
              <div>
                <h3 className="font-display font-extrabold text-lg text-white">Reality Check</h3>
                <p className="text-white/60 text-sm mt-1 leading-relaxed">Top 3 checken op echte prijs, bedden, regels. Dan boeken.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Golf vs Beach - visual split */}
        <section className="relative h-[40vh] min-h-[280px]">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 relative overflow-hidden">
              <img src={heroGolf} alt="Golf" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <h3 className="font-display font-extrabold text-xl text-white">Golf-base</h3>
                <p className="text-white/60 text-xs mt-2 leading-relaxed max-w-[140px]">Max golf gemak. Rustiger avonden. Rijden voor strand.</p>
              </div>
            </div>
            <div className="w-1/2 relative overflow-hidden">
              <img src={heroBeach} alt="Strand" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <h3 className="font-display font-extrabold text-xl text-white">Strand-base</h3>
                <p className="text-white/60 text-xs mt-2 leading-relaxed max-w-[140px]">Lopen naar eten en strand. Rijden naar La Cala Golf.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Auto vs Taxi */}
        <section className="px-6 py-10 bg-background">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">Vervoer</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-foreground text-background rounded-xl p-5">
              <h3 className="font-display font-extrabold text-base">Huurauto</h3>
              <p className="text-white/60 text-xs mt-2 leading-relaxed">
                Vrijheid. Strand, dorpen, Marbella. Maar: parkeren + iemand rijdt.
              </p>
            </div>
            <div className="border-2 border-foreground rounded-xl p-5">
              <h3 className="font-display font-extrabold text-base">Taxi</h3>
              <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
                Niemand rijdt. Maar: ritten stapelen op, soms 2 taxi's.
              </p>
            </div>
          </div>
        </section>

        {/* Villa image + checklist overlay */}
        <section className="relative min-h-[320px]">
          <img src={heroVilla} alt="Villa terrace" className="w-full h-64 object-cover" />
          <div className="px-6 py-8 bg-background">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Checklist top 3</p>
            <ul className="space-y-3">
              {[
                "Bedden en slaapkamers kloppen voor 5 volwassenen",
                "Totaalprijs all-in: fees, schoonmaak, tax, borg",
                "Parkeren geregeld als we een auto nemen",
                "Annulering ok – geen nonref tenzij iedereen akkoord",
                "Recente reviews en realistische check-in",
              ].map((item, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5 font-display font-bold text-xs">
                    {i + 1}
                  </div>
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Vaste gegevens - dark block */}
        <section className="bg-foreground text-background px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-4">Vaste gegevens</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50">Reis</span>
              <span className="font-semibold text-white">2 – 5 april 2026</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50">Groep</span>
              <span className="font-semibold text-white">5 volwassenen</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50">Vluchten ochtend</span>
              <span className="font-semibold text-white">Robin, Mark, Dimitri</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/50">Vluchten middag</span>
              <span className="font-semibold text-white">Edwin, Hans</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Golf</span>
              <span className="font-semibold text-white">Min. 2x, max 3x 18 holes</span>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
