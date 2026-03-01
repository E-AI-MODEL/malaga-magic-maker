import { AppLayout } from "@/components/AppLayout";

export default function Info() {
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Hero */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Het doel</p>
          <h2 className="font-display text-xl font-extrabold leading-tight">
            We kiezen <span className="text-primary">1 verblijf</span> dat werkt voor 5 man.
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Golf én omgeving. Snel beslissen en boeken.
          </p>
        </section>

        {/* Game rounds */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">De game: 3 rondes</p>
          <div className="space-y-3">
            {[
              { round: "1", title: "Sloperhamer", desc: "Kill criteria filtert alles dat niet kan. Bedden, kamers, annulering, reistijd golf – wat niet past vliegt eruit.", color: "bg-destructive" },
              { round: "2", title: "Scorebord", desc: "Jullie punten bepalen de ranking. Wat vinden jullie het belangrijkst? Golf gemak, strand, budget? De top stijgt.", color: "bg-primary" },
              { round: "3", title: "Reality check", desc: "Top 3 check op echte prijs, bedden, regels. Dan boeken!", color: "bg-foreground" },
            ].map(r => (
              <div key={r.round} className="flex gap-3 items-start">
                <div className={`${r.color} text-white font-display font-bold text-xs h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5`}>
                  {r.round}
                </div>
                <div>
                  <p className="font-display font-bold text-sm">{r.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Transport */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Auto vs Taxi</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: "🚗", title: "Huurauto", desc: "Vrijheid voor strand, Mijas Pueblo, Marbella, Málaga. Makkelijke golfdagen. Maar: parkeren + iemand moet rijden + 2 aankomsttijden." },
              { icon: "🚕", title: "Taxi life", desc: "Niemand rijdt. Maar: ritten naar golf stapelen snel op, soms 2 taxi's voor 5 man." },
            ].map(t => (
              <div key={t.title} className="border rounded-lg p-4">
                <p className="font-display font-bold text-sm mb-1">{t.icon} {t.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Base */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Golf-base vs Strand-base</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: "⛳", title: "Golf-base", desc: "Max golf gemak, rustiger avonden. Vaker rijden voor strand/leven." },
              { icon: "🏖️", title: "Strand-base", desc: "Lopen naar eten en strand. Golfdagen rijden naar La Cala." },
            ].map(t => (
              <div key={t.title} className="border rounded-lg p-4">
                <p className="font-display font-bold text-sm mb-1">{t.icon} {t.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Checklist */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Checklist top 3</p>
          <ul className="space-y-2.5">
            {[
              "Bedden en slaapkamers kloppen echt voor 5 volwassenen",
              "Totaalprijs is all-in (fees, schoonmaak, tax, borg, parkeren)",
              "Parkeren geregeld als auto",
              "Annulering ok (geen nonref tenzij iedereen het wil)",
              "Recente reviews en realistische check-in",
            ].map((item, i) => (
              <li key={i} className="flex gap-3 items-start text-sm">
                <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Fixed info */}
        <section className="bg-secondary rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Vaste gegevens</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li><span className="font-semibold text-foreground">Reis:</span> 2 – 5 april 2026 (3 nachten)</li>
            <li><span className="font-semibold text-foreground">Groep:</span> 5 volwassenen</li>
            <li><span className="font-semibold text-foreground">Vluchten:</span> Robin, Mark, Dimitri (do ochtend) · Edwin, Hans (do middag)</li>
            <li><span className="font-semibold text-foreground">Golf:</span> Min. 2x 18 holes, max 3x 18 holes bij La Cala Golf</li>
          </ul>
        </section>
      </div>
    </AppLayout>
  );
}
