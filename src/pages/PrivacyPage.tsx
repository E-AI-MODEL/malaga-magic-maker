import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="mb-6 rounded-full">
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Terug
          </Link>
        </Button>
        <h1 className="font-brand text-3xl font-semibold">Privacybeleid</h1>
        <p className="mt-4 text-sm text-muted-foreground">Laatst bijgewerkt: {new Date().getFullYear()}.</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-brand text-lg font-semibold">1. Welke data we verzamelen</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Accountgegevens: e-mailadres, naam en gekozen wachtwoord.</li>
              <li>Reisgegevens: bestemmingen, datums, documenten, kosten en groepsleden.</li>
              <li>Gebruiksgegevens: anonieme statistieken over fouten en prestaties.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">2. Waarvoor we data gebruiken</h2>
            <p className="mt-2">
              We gebruiken je data alleen om Vakansie beschikbaar te maken, te onderhouden en te verbeteren. We
              verkopen geen persoonsgegevens en delen ze niet met adverteerders.
            </p>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">3. Documenten en foto's</h2>
            <p className="mt-2">
              Reisdocumenten, tickets en foto's worden opgeslagen in een privé-opslagruimte. Alleen jijzelf en de
              leden van de reis waaraan je ze koppelt hebben toegang.
            </p>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">4. Betalingen</h2>
            <p className="mt-2">
              Betalingen lopen via Stripe. Wij slaan geen creditcardgegevens op. Zie het{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                privacybeleid van Stripe
              </a>{" "}
              voor meer informatie.
            </p>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">5. Bewaartermijn</h2>
            <p className="mt-2">
              We bewaren je gegevens zolang je account actief is. Je kunt je account en bijbehorende data op elk moment
              laten verwijderen via je profiel.
            </p>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">6. Contact</h2>
            <p className="mt-2">
              Vragen over je privacy? Mail ons via{" "}
              <a href="mailto:hello@vakansie.app" className="font-semibold text-primary hover:underline">
                hello@vakansie.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
