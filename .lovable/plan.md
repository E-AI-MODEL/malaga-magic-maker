# Knaakie: eigen plek en eenvoudiger bonnetjes

## Doel
Knaakie wordt de herkenbare plek voor gedeelde kosten binnen een reis. De geschreven naam op een bonnetje betekent **wie betaalde**.

## 1. Eigen plek in de navigatie
- Onderste reisnavigatie: **Overzicht · Reis · Samen · Knaakie**, met een bonnetje-icoon voor Knaakie.
- Eigen scherm op `/trip/:tripId/knaakie`, ook bereikbaar vanuit de desktopzijbalk.
- Verplaats de bestaande kostenlijst, verdeling en betaalverzoeken van Samen naar Knaakie. Geen dubbele kostenadministratie; Samen houdt Taken, Keuzes en Reizigers.
- Werk bestaande links vanuit Home en Overzicht bij; oude links naar het kostendeel van Samen blijven naar de juiste plek leiden.
- Behoud de geïntegreerde Hansie-balk, voldoende ruimte boven de vaste navigatie en bestaande regels voor gearchiveerde reizen.

## 2. Eigen karakter, minder uitzoekwerk
- Gebruik de bestaande Signal-stijl: sterke typografie, dunne scheidingslijnen en een subtiel bonnetje-motief. Geen nieuwe huisstijl, dashboardtegels of extra logo.
- Zet jouw positie vooraan: wat jij moet betalen of terugkrijgt, met concrete namen en bedragen. Bereken verschillende valuta afzonderlijk; niets omrekenen of ongemerkt samenvoegen.
- Eén hoofdactie: **Bonnetje toevoegen**. Daarbinnen kies je een foto of handmatige invoer.
- Daaronder **Bonnetjes** en **Wie betaalt wie**. Houd details ingeklapt en maak betalen/terugkrijgen visueel onderscheidbaar zonder alleen op kleur te vertrouwen.
- Kortere, natuurlijke formulieren: waarvoor, totaalbedrag, wie betaalde en wie meebetaalt. Toon de verdeling vóór opslaan.
- Behoud huidige betaalverzoeken, IBAN-privacy en bewerkrechten. Een betaalverzoek versturen is geen bewijs dat iemand betaald heeft; voeg geen betaalstatus of betaalintegratie toe.

## 3. Bonnetjesherkenning met controle
**Gecontroleerd in de huidige code:** uitgaven worden handmatig ingevoerd in `ExpenseSheet`. Er is al AI-extractie voor reisdocumenten, maar nog geen bonnenherkenning voor Knaakie.

- Voeg foto kiezen/fotograferen toe aan Bonnetje toevoegen, eerst voor JPG, PNG en WebP. Geen PDF- of regel-voor-regelverdeling in deze ronde.
- Laat de herkenning een **voorstel** maken voor omschrijving/winkel, totaalbedrag, valuta, datum indien leesbaar en de geschreven naam van de betaler.
- Koppel een herkende naam alleen aan een bestaande reiziger van deze reis als de match ondubbelzinnig is. Bij dubbele namen, onleesbaar handschrift of ontbrekende informatie kiest de gebruiker zelf. Nooit automatisch iemand aanmaken.
- Vul het formulier voor; toon de foto naast/boven het voorstel. De gebruiker controleert betaler, bedrag en verdeling en kiest **Opslaan**. Herkenning schrijft zelf geen kosten weg.
- Handmatige invoer blijft altijd beschikbaar bij een onleesbare bon, storing of onvoldoende AI-tegoed.
- Test handschrift met representatieve voorbeeldbonnen. Nauwkeurigheid is geen garantie; meld de gemeten uitkomsten en beperkingen.

## Privacy en kosten
- Maak vóór herkenning duidelijk dat de foto naar een AI-dienst gaat voor uitlezen. AI-gebruik brengt verbruikskosten mee voor het project.
- Geen IBAN uit Profiel, e-mailadressen, interne gebruikers-ID’s of volledige reizigerslijst naar de AI. De naam uit de bon wordt binnen de app gekoppeld aan een gebruikers-ID.
- Verwerk de foto tijdelijk; bewaar hem in deze ronde niet als reisdocument of blijvende bonbijlage. Geen foto, ruwe bontekst of herkende persoonsgegevens in foutlogs of Hansie-context.
- Alleen een ingelogde, bevoegde reiziger mag herkenning voor die reis aanvragen. Bestaande rechten blijven leidend bij opslaan.

## Technische uitwerking
- Hergebruik bestaande `expenses`, `expense_splits`, geldberekening en betaalverzoekfunctionaliteit. Geen nieuwe tabellen nodig voor tijdelijk herkennen en voorinvullen.
- Maak de Knaakie-presentatie gedeeld waar nodig, zodat verplaatsen geen kopie van de logica oplevert.
- Gebruik een afzonderlijke beveiligde bonherkenningsfunctie, zodat bestaande extractie van boekingen/reisdocumenten ongewijzigd blijft. Controleer sessie, reislidmaatschap, bestandstype, grootte en uitvoer; laat deze functie niet zelf uitgaven opslaan.
- Controleer bij uitvoering de beschikbare visionmodellen en het toegestane gegevensbewaarbeleid. Gebruik de actuele Lovable AI-default en gedocumenteerde beeldinvoer; geen wijziging aan bestaande Hansie-modellen.
- Werk routering, AppLayout, onderste navigatie, zijbalk, interne links, roadmap, klantnamen en architectuurafspraken bij. Deze expliciete keuze vervangt de huidige afspraak van drie reisnavigatieknoppen.
- Uitvoering via een afgebakende branch/PR en controles volgens het productiecontract; geen stilzwijgende direct-mainwijziging of publicatie.

## Acceptatie en controles
- Knaakie opent binnen de juiste reis via mobiele navigatie, zijbalk en bestaande kostenlinks; geen verlies of dubbele weergave van bestaande kosten.
- Tests voor bedragen/valuta, ondubbelzinnige naamkoppeling, dubbele/onbekende namen, onleesbare bon, ongeldige invoer en geweigerde toegang.
- End-to-end: bon kiezen → herkenning → bedrag/betaler corrigeren → verdeling kiezen → opslaan → bedrag terugzien in Knaakie en betaalverzoek. Controleer ook handmatige invoer en annuleren zonder opgeslagen uitgave.
- Bekijk de schermen ingelogd op **390px en desktop**: vier navknoppen, Hansie-balk, lange namen, bedragen en toetsenbord zonder overlap.
- Draai lint en tests, controleer automatische typecheck/productiebuild en de nieuwe functiecheck. Meld gewijzigde bestanden, uitkomsten, herkenningskwaliteit en alles wat niet werkelijk getest kon worden.

## Buiten scope
Automatische betalingen, bancaire koppelingen, blijvend opslaan van bonfoto’s, artikelverdeling op naam, nieuwe abonnementslimieten en wijzigingen aan `choose_trip_idea` / `undo_trip_idea_choice`.