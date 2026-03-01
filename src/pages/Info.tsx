import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Info() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <section>
          <h2 className="font-display text-xl font-bold mb-2">🎯 Het doel</h2>
          <p className="text-muted-foreground">
            We kiezen <strong>1 verblijf</strong> dat werkt voor 5 man. Golf én omgeving. Snel beslissen en boeken.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold mb-3">🎮 De game: 3 rondes</h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive">Ronde 1</Badge>
                  <span className="font-display font-semibold">Sloperhamer</span>
                </div>
                <p className="text-sm text-muted-foreground">Kill criteria filtert alles dat niet kan. Bedden, kamers, annulering, reistijd golf – wat niet past vliegt eruit.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-secondary text-secondary-foreground">Ronde 2</Badge>
                  <span className="font-display font-semibold">Scorebord</span>
                </div>
                <p className="text-sm text-muted-foreground">Jullie punten bepalen de ranking. Wat vinden jullie het belangrijkst? Golf gemak, strand, budget? De top stijgt.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-accent text-accent-foreground">Ronde 3</Badge>
                  <span className="font-display font-semibold">Reality check</span>
                </div>
                <p className="text-sm text-muted-foreground">Top 3 check op echte prijs, bedden, regels. Dan boeken! 🎉</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold mb-3">🚗 vs 🚕 Consequenties</h2>
          <div className="grid grid-cols-1 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold mb-1">🚗 Huurauto</p>
                <p className="text-sm text-muted-foreground">Vrijheid voor strand, Mijas Pueblo, Marbella, Málaga. Makkelijke golfdagen. Maar: parkeren + iemand moet rijden + 2 aankomsttijden.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold mb-1">🚕 Taxi life</p>
                <p className="text-sm text-muted-foreground">Niemand rijdt. Maar: ritten naar golf stapelen snel op, soms 2 taxi's voor 5 man.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold mb-3">⛳ vs 🏖️ Base</h2>
          <div className="grid grid-cols-1 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold mb-1">⛳ Golf-base</p>
                <p className="text-sm text-muted-foreground">Max golf gemak, rustiger avonden. Vaker rijden voor strand/leven.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold mb-1">🏖️ Strand-base</p>
                <p className="text-sm text-muted-foreground">Lopen naar eten en strand. Golfdagen rijden naar La Cala.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold mb-3">✅ Checklist top 3</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><span>🛏️</span> Bedden en slaapkamers kloppen echt voor 5 volwassenen</li>
            <li className="flex gap-2"><span>💰</span> Totaalprijs is all-in (fees, schoonmaak, tax, borg, parkeren)</li>
            <li className="flex gap-2"><span>🅿️</span> Parkeren geregeld als auto</li>
            <li className="flex gap-2"><span>🔄</span> Annulering ok (geen nonref tenzij iedereen het wil)</li>
            <li className="flex gap-2"><span>⭐</span> Recente reviews en realistische check-in</li>
          </ul>
        </section>

        <section className="bg-muted rounded-lg p-4 text-sm">
          <h3 className="font-display font-semibold mb-2">📋 Vaste gegevens</h3>
          <ul className="space-y-1 text-muted-foreground">
            <li><strong>Reis:</strong> 2 – 5 april 2026 (3 nachten)</li>
            <li><strong>Groep:</strong> 5 volwassenen</li>
            <li><strong>Vluchten:</strong> Robin, Mark, Dimitri (do ochtend) · Edwin, Hans (do middag)</li>
            <li><strong>Golf:</strong> Minimaal 2x 18 holes, misschien 3x 18 holes bij La Cala Golf</li>
          </ul>
        </section>
      </div>
    </AppLayout>
  );
}
