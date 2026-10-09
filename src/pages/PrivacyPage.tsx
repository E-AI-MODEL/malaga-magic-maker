import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";


function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-brand text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

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
        <h1 className="font-brand text-3xl font-semibold">Privacyverklaring</h1>
        <p className="mt-4 text-sm text-muted-foreground">Laatst bijgewerkt: 9 oktober 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <Section title="Wie wij zijn">
            <p>
              Vakansie is een dienst van EAI Analyse en Advies, Jacobus Visserstraat 10, 2662 JL Bergschenhoek, KvK 97303305.
              Wij zijn verantwoordelijk voor de verwerking van je gegevens. Vragen? Mail{" "}
              <a href="mailto:hello@vakansie.app" className="font-semibold text-primary hover:underline">hello@vakansie.app</a>.
            </p>
          </Section>

          <Section title="Welke gegevens we verwerken">
            <ul className="list-disc space-y-1 pl-5">
              <li>Account: e-mailadres, naam en wachtwoord (versleuteld opgeslagen).</li>
              <li>Reisgegevens: bestemming, data, onderdelen, taken, keuzes en wie er meegaat.</li>
              <li>Documenten zoals tickets en bevestigingen, privé opgeslagen bij de reis.</li>
              <li>Kosten en verdeling binnen de reis. Je IBAN en rekeninghouder zie alleen jij; ze komen alleen in betaalverzoeken die jij zelf verstuurt.</li>
              <li>Reizigerswensen. Dieet en allergieën zijn gezondheidsgegevens; die bewaren we alleen als je daar toestemming voor geeft.</li>
              <li>Betalingen voor Pro lopen via Stripe. Wij zien geen kaartgegevens, alleen dat en wanneer je betaald hebt.</li>
              <li>Je vragen aan Hansie en zijn antwoorden.</li>
              <li>Pushabonnementen als je meldingen aanzet op een apparaat.</li>
              <li>Technische foutmeldingen. Die zijn aan je account gekoppeld, zodat we fouten kunnen oplossen; ze zijn dus niet anoniem.</li>
              <li>Lokale opslag in je browser, bijvoorbeeld om ingelogd te blijven en je laatste reis te onthouden. We gebruiken geen trackingcookies.</li>
            </ul>
          </Section>

          <Section title="Waarom en op welke grondslag">
            <ul className="list-disc space-y-1 pl-5">
              <li>Uitvoering van de overeenkomst: om Vakansie te laten werken, voor jou en je reisgenoten.</li>
              <li>Toestemming: voor gezondheidsgegevens (dieet en allergieën) en pushmeldingen. Je kunt die toestemming altijd intrekken.</li>
              <li>Gerechtvaardigd belang: voor beveiliging en het opsporen van fouten.</li>
            </ul>
            <p>We verkopen geen gegevens en delen niets met adverteerders.</p>
          </Section>

          <Section title="Verwerkers en ontvangers">
            <ul className="list-disc space-y-1 pl-5">
              <li>Lovable / Lovable Cloud: hosting, database, opslag en e-mail via notify.vakansie.app.</li>
              <li>Supabase: de techniek achter database, inloggen en opslag.</li>
              <li>Stripe: betalingen voor Pro.</li>
              <li>Google Gemini via de Lovable AI-gateway: de dienst achter Hansie. Krijgt de reisgegevens die nodig zijn en je vraag; geen e-mailadressen, IBAN's of documentbestanden.</li>
              <li>Firecrawl: alleen bij het zoeken naar verblijven, de zoektermen en links.</li>
              <li>MET Norway: alleen de coördinaten van de bestemming, voor het weer.</li>
              <li>OpenStreetMap/Nominatim en Photon: alleen de naam van de bestemming, om die op de kaart te vinden.</li>
              <li>De pushdiensten van Apple, Google, Mozilla en Microsoft: de melding zelf, als je push aanzet.</li>
              <li>Je eigen agenda-app, als je een agenda-link gebruikt: de onderdelen van die reis.</li>
              <li>Je reisgenoten zien wat je in een gedeelde reis zet.</li>
            </ul>
          </Section>

          <Section title="Doorgifte buiten de EU">
            <p>
              Sommige verwerkers zitten in de Verenigde Staten. Die doorgifte gebeurt op basis van passende waarborgen: het
              EU-VS Data Privacy Framework of de modelcontractbepalingen van de Europese Commissie.
            </p>
          </Section>

          <Section title="Hoe lang we gegevens bewaren">
            <p>
              Zolang je account bestaat. Verwijder je je account, dan wissen we alles direct. Alleen wat we wettelijk moeten
              bewaren blijft: betaalgegevens worden 7 jaar bewaard bij Stripe.
            </p>
          </Section>

          <Section title="Je rechten">
            <p>
              Je mag je gegevens inzien, laten corrigeren en laten verwijderen. Verwijderen doe je zelf via Profiel. Je mag ook
              bezwaar maken, je gegevens laten overdragen en een gegeven toestemming intrekken. Mail daarvoor{" "}
              <a href="mailto:hello@vakansie.app" className="font-semibold text-primary hover:underline">hello@vakansie.app</a>.
              Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de Autoriteit
              Persoonsgegevens.
            </p>
          </Section>

          <Section title="Beveiliging">
            <p>
              Alle verbindingen zijn versleuteld. Alleen leden van een reis kunnen de gegevens van die reis zien, documenten
              staan in afgeschermde opslag en zijn alleen via tijdelijke links te openen. Medewerkers kunnen je wachtwoord
              niet inzien.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
