# Integrale vernieuwing: van administratiemap naar reisapp

## Doel
De hele ingelogde app voelt als één doordacht product, geen formulierenmap. Elke wijziging gaat door alle schermen tegelijk, niet scherm voor scherm. Geen nieuwe functies, geen database- of rechtenwijzigingen. Onderbalk blijft exact Overzicht · Reis · Samen; Knaakie blijft binnen Samen → Kosten met de vaste snelknop.

## Uitgangspunten (gelden voor elk scherm)
1. Eén scherm, één vraag: elk scherm beantwoordt bovenaan "wat is dit en wat doe ik nu" in één zin plus één oranje knop.
2. Inhoud eerst, uitleg nooit apart: geen uitlegblokken, legenda's of instructiezinnen. Een lege lijst toont één regel en één knop.
3. Geen aannames: geen scores, X/Y, "Draaiboek", "Nog regelen", "Wat telt nu". Solo, eigen vervoer en reizen zonder verblijf zijn normaal.
4. Direct doorklikken: elke rij opent het item zelf (taak, keuze, kosten, onderdeel), nooit eerst een overzichtslijst.
5. Gewone taal: korte werkwoorden ("Voeg vlucht toe", "Stem", "Betaal Piet € 43,50"). Geen ambtelijke of technische woorden.

## Visuele richting (één richting, overal)
- Reisgevoel: per reis een foto/kleurvlak bovenaan Overzicht, Reis en Samen (bestaande reisafbeelding), korter op Reis/Samen.
- Ruimere opbouw: minder lijnen en kaders, meer witruimte; secties gescheiden door kop en ruimte, niet door randen rond alles.
- Rijen met karakter: onderdelen van de reis met icoon in reiskleur (vervoer, verblijf, activiteit, eten), tijd groot links, titel en plaats rechts — een tijdlijn in plaats van een tabel.
- Typografie: één grote kop per scherm in display-letter (normale hoofdletters), sectiekoppen rustig en klein, lopende tekst 15–16px. Hoofdletters alleen voor het aftelmoment.
- Oranje alleen voor de ene hoofdactie per scherm. Status in woorden, kleur ondersteunend.
- Knoppen, invoervelden en sheets uit één gedeelde set; geen losse varianten per scherm.

## Werk per scherm

### 1. Home (/trips)
- Kop "Hoi {naam}" + "Nieuwe reis".
- Eerstvolgende reis als grote fotokaart: naam, data, "nog N dagen", eerste concrete actie als knop.
- "Voor jou": max. 5 rijen (taak, stem, betaal), elk direct naar het item.
- Andere reizen compact; afgelopen reizen ingeklapt.
- Lege toestand: foto, één zin, "Plan je eerste reis".

### 2. Nieuwe reis
- Kortere invoer: bestemming en data eerst; reisgenoten optioneel ("Ik ga alleen" is een gewone keuze).
- Na aanmaken direct naar Overzicht met de eerste suggesties, geen tussenstap.

### 3. Overzicht
- Bovenaan: reisfoto, naam, data, aftellen (enige hoofdlettermoment), weer.
- "Eerst dit": één tot drie concrete acties uit wat de gebruiker al invoerde; niets over ontbrekende hotels/groep als die niet bijgehouden worden.
- "Komende dagen": eerstvolgende onderdelen als mini-tijdlijn, rij opent onderdeel.
- Hansie-vragen kort en concreet bij de inhoud.
- Afgelopen reis: "Deze reis is afgelopen." + openstaande kosten.

### 4. Reis
- Tijdlijn per dag met dagkop ("Za 14 jun"), lijn alleen tussen onderdelen.
- Ideeën apart onder "Ideeën" (tellen nooit als geboekt), met "Dit wordt het" voor organisator.
- Eén knop "Toevoegen" opent keuze: Vlucht, Eigen vervoer, Verblijf, Activiteit, Eten, Anders, Boeking plakken.
- Documenten als compacte regel met aantal; lege toestand één regel + knop.
- Verwijder alle instructiezinnen en verwijzingen naar niet-bestaande statussen.

### 5. Samen
- Bovenaan vier sectieknoppen Reizigers · Taken · Keuzes · Kosten met per sectie één getal tussen haakjes alleen als er iets voor jou openstaat.
- Soloreis: Reizigers toont "Je reist alleen · Nodig iemand uit"; Keuzes/Kosten blijven bruikbaar maar zonder groepsteksten.
- Taken: eigen taken eerst, afvinken in de rij.
- Keuzes: stemmen direct in de rij.
- Kosten (Knaakie): "Wie betaalt wie" bovenaan, daaronder uitgaven; "Bonnetje toevoegen" en "Uitgave toevoegen" naast elkaar.

### 6. Formulieren en sheets
- Alle sheets op de gedeelde basis: kop als vraag ("Wat ga je doen?"), max. 4 velden zichtbaar, rest onder "Meer details".
- Opslaan-knop altijd zichtbaar onderaan, boven toetsenbord en veilige zone.
- Foutmeldingen in gewone taal bij het veld.

### 7. Profiel, Reisinstellingen, Inloggen/Aanmelden
- Zelfde lay-out en typografie als de rest; groepen ingeklapt (Meldingen, Plan, Privacy, Account).
- Inloggen en aanmelden visueel gelijk aan de homepage (zelfde logo, kleur, foto).

### 8. Navigatie en vaste balken
- Onderbalk Overzicht · Reis · Samen met leesbare labels boven de home-indicator.
- Hansie-balk direct erboven, zelfde oppervlak; Knaakie-snelknop zonder overlap.
- Pagina-inhoud nooit onder vaste balken (ruimte gereserveerd).
- Desktop: zijbalk met Home, reis-schermen, Profiel; Hansie in de inhoudskolom.

### 9. Taalronde over de hele app
- Volledige lijst van alle zichtbare teksten verzamelen en herschrijven volgens de uitgangspunten.
- Verboden-woordenlijst met test: Draaiboek, Nog regelen, Wat telt nu, rustig, geregeld-scores, X/Y, technische namen, Afvalrace.

## Volgorde van bouwen
```text
Fase A  Fundament  gedeelde stijl, kop, rijen, tijdlijn-rij, lege toestand, sheets, knoppen
Fase B  Taal       alle teksten + verboden-woordentest
Fase C  Schermen   Home, Nieuwe reis, Overzicht, Reis, Samen, Profiel/Instellingen, Inloggen
Fase D  Balken     onderbalk, Hansie, Knaakie, desktop
Fase E  Controle   alle schermen 390px en desktop, ingelogd, solo + groep + afgelopen reis
```
Fases A en B eerst, omdat C dan vanzelf consistent wordt. Elke fase wordt volledig afgerond over alle schermen voordat de volgende begint.

## Klaar-criteria
- Geen scherm bevat uitlegblokken, scores, X/Y of verboden woorden (test).
- Elke rij in Home, Overzicht en Samen opent het item zelf.
- Solo-reis met eigen vervoer en zonder verblijf toont geen waarschuwingen over groep/verblijf/vlucht.
- Elk scherm heeft precies één oranje hoofdactie.
- Op 390px: geen horizontale scroll, niets onder vaste balken, labels leesbaar; ook op 1280px.
- Toetsenbordfocus zichtbaar; invoer minimaal 16px; geen pagina-animaties.
- Typecheck, lint, tests en build groen; screenshots van elk scherm (leeg, gevuld, solo, groep, afgelopen) als bewijs.

## Buiten scope
Nieuwe functies, database/rechten, betalingen, Hansie-logica, Beheer-scherm, homepage (behalve gedeelde stijl), nieuwe routes of tabs.

## Technische details
- Gedeelde onderdelen in `src/components/primitives.tsx` en `FormSheet.tsx` uitbreiden (PageHeader, TimelineRow, EmptyLine, ActionButton); tokens in `src/index.css`/tailwind, geen losse kleuren.
- Schermen: `Trips.tsx`, `NewTrip.tsx`, `TripHome.tsx`, `TripReis.tsx`, `TripSamen.tsx`, `KostenSection.tsx`, `Profiel.tsx`, `TripSettings.tsx`, `Login.tsx`, `Signup.tsx`, alle `*Sheet.tsx`, `BottomNav.tsx`, `HansieWidget.tsx`, `AppLayout.tsx`, `AppSidebar.tsx`.
- Data-logica (`readiness`, `preparation`, `home-data`, `settle`) blijft ongewijzigd behalve tekstafleiding; "Eerst dit" gebruikt alleen ingevoerde gegevens.
- Nieuwe test: verboden-woordenscan over `src/pages` en `src/features`; rij-link-tests voor Home/Samen; solo-scenario test voor Overzicht.
- Browsercontrole ingelogd via Playwright met testsessie; als sessie ontbreekt wordt dat expliciet gemeld.
