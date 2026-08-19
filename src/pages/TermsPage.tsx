import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="mb-6 rounded-full">
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Terug
          </Link>
        </Button>
        <h1 className="font-brand text-3xl font-semibold">Gebruiksvoorwaarden</h1>
        <p className="mt-4 text-sm text-muted-foreground">Laatst bijgewerkt: {new Date().getFullYear()}.</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-brand text-lg font-semibold">1. Wat is Vakansie</h2>
            <p className="mt-2">
              Vakansie is een online reisdossier waarin je je vakanties, taken, documenten, kosten en afspraken
              beheert. De service is bedoeld voor privégebruik en kleine reisgroepen.
            </p>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">2. Account</h2>
            <p className="mt-2">
              Voor Vakansie heb je een account nodig. Je bent zelf verantwoordelijk voor de veiligheid van je
              wachtwoord. Deel geen inloggegevens met anderen.
            </p>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">3. Je data</h2>
            <p className="mt-2">
              Je behoudt eigendom van de reisgegevens die je in Vakansie opslaat. Wij gebruiken je data alleen om
              de service te draaien, te verbeteren en je te ondersteunen. Zie ook ons{" "}
              <Link to="/privacy" className="font-semibold text-primary hover:underline">
                Privacybeleid
              </Link>
              .
            </p>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">4. Betalingen</h2>
            <p className="mt-2">
              De basisversie van Vakansie is gratis. Een vrijwillige Pro-bijdrage is eenmalig en geeft toegang tot
              verruimde limieten. Pro-bijdragen zijn niet-restitueerbaar, tenzij anders vereist door de wet.
            </p>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">5. Wijzigingen</h2>
            <p className="mt-2">
              We kunnen deze voorwaarden van tijd tot tijd aanpassen. Bij ingrijpende wijzigingen informeren we je
              actief.
            </p>
          </section>
          <section>
            <h2 className="font-brand text-lg font-semibold">6. Contact</h2>
            <p className="mt-2">
              Vragen? Mail ons via{" "}
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
