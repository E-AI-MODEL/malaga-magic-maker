# Roadmap

## Integrale vernieuwing (goedgekeurd plan)
- [x] Fase B deel 1: afgewezen woorden verwijderd + automatische woordencontrole
- [x] Fase A: gedeelde stijl doorgevoerd — PageHeader op Home, Nieuwe reis, Reis/Samen, Profiel/Instellingen en auth; TimelineRow op Overzicht/Reis; gedeelde lege toestand, neutrale sectiekeuze, grotere knoppen/invoer en vaste formulier-opslagstrook
- [x] Fase A controles: 268 tests geslaagd; lint 0 fouten/24 bestaande waarschuwingen; automatische typecheck/build OK; login, aanmelden en herstel op 390px/1280px zonder overflow/runtimefouten, invoer 16px
- [ ] Fase A ingelogde visuele controle en toetsenbord bij sheets — geblokkeerd: testsessie voor verzoeker kan niet worden aangemaakt; preview-login nodig. Bestaand logo laadt niet in lokale browser; live beeld niet bevestigd
- [ ] Fase B deel 2: volledige taalronde alle schermen
- [ ] Fase C: Home, Nieuwe reis, Overzicht, Reis, Samen, Profiel/Instellingen, Inloggen
- [ ] Fase D: onderbalk, Hansie, Knaakie, desktop
- [ ] Fase E: ingelogde controle 390px/desktop (solo, groep, afgelopen)

## Mobiele Knaakie-footer
- [x] Vaste Knaakie-knop naar bestaande Samen → Kosten; URL-gestuurde sectie werkt ook vanuit Samen, geen nieuwe route/migratie
- [x] 268 tests geslaagd; lint 0 fouten/24 bestaande waarschuwingen; automatische build OK
- [ ] Ingelogde mobiele controle — previewsessie opent login; vernieuwen voor verzoeker mislukt omdat geen overeenkomend account gevonden is. Gebruiker moet in de preview inloggen

## Bonherkenning binnen Samen → Kosten
- [x] Live test 30 okt: testbon via ingelogd account → omschrijving, EUR 31,50 en datum correct herkend (gedrukte naam bewust genegeerd)
- [x] Knaakie-knop scrolt direct naar Kosten; lege Documenten-tekst ingekort, dubbele knop weg
- [x] Ingelogde controle 390px/desktop: Home, Overzicht, Reis, Samen, Kosten, Profiel, Nieuwe reis zonder overflow of fouten
- [x] Drie hoofdknoppen behouden; Knaakie als kostensectie, geen extra route of migratie
- [x] Gateway-SDK geïmporteerd, workspacecatalogus inbegrepen; beeldinvoer en zero-retention op Responses bevestigd
- [x] Tijdelijke bonfoto, expliciete verwerkingstoestemming, betaler lokaal koppelen en gecontroleerd opslaan via bestaande kostenfunctie
- [x] 265 tests en 3 functietests geslaagd; functie-typecheck en automatische productiebuild/typecheck OK; lint 0 fouten, 24 bestaande waarschuwingen
- [x] Fictieve bon via echte Gateway: EUR 43,50 en datum correct; getypte schuine naam niet als handschrift beschouwd (null). Geen representatieve handschriftmeting
- [x] receipt-extract gedeployed; openbaar mobiel scherm zonder overflow of runtimefouten
- [ ] Ingelogde controle Samen → Kosten op 390px/desktop, echte bon → correctie → opslaan → teruglezen — geblokkeerd: geen sessie voor verzoeker; zelfstandig aanmelden leverde geen overeenkomend account
- [ ] VoiceOver, echte telefooncamera en representatieve handschriftbonnen — vereisen apparaat en voorbeeldbonnen van gebruiker

## Home-ronde
- [x] Vaste landing /trips met voorrang voor uitnodiging en expliciete next
- [x] Home-labels, begroeting, eerstvolgende reis, Aan de slag en accountregel
- [x] Voor jou over actieve reizen: taken, keuzes en Knaakie; gebundelde reads
- [x] 240 tests geslaagd; lint 0 fouten/24 bestaande waarschuwingen; automatische typecheck/build OK; ingelogd Home, Naar reis en Keuzes gecontroleerd op desktop en 390px, geen overflow/runtimefouten
- [x] Klantnamen en architectuurafspraken bijwerken

Home-ronde: gewijzigd `src/App.tsx`, `src/features/trips/start.ts` en tests, `src/components/AppSidebar.tsx`, `src/components/AppLayout.tsx`, `src/pages/Trips.tsx`, `src/pages/TripHome.tsx`, `src/pages/TripSamen.tsx`; toegevoegd `src/features/trips/home-data.ts` en tests, `src/features/trips/preparation.ts`; bestaande contracttests aangepast voor de gedeelde logica. Klantnamen bijgewerkt in `docs/VAKANSIE_MASTERPLAN.md` en knowledge; afspraken in `AGENTS.md`. Geen migraties/tabellen. Knaakie met meerdere reizen/valuta getest in selectie-tests; beschikbaar ingelogd account had alleen een open keuze, geen uitgaand bedrag voor een echte betalingstest. Handmatige typecheck/build niet gestart: deze omgeving voert beide automatisch uit.

- [x] Lay-outcorrecties: lichte hover, gedeelde zijbalk, Hansie onder desktopinhoud, afgelopen reizen en filtering Eerstvolgend
- [x] Privacy: ops_delete_user wist trip_traveler_profiles via nieuwe migratie en contracttest
- [x] Controles: 162 tests geslaagd, lint 0 fouten/18 bestaande waarschuwingen, automatische build OK; ingelogde schermen op 390/768/1024/1280px zonder horizontale overflow
- [ ] Automatische typecheck-uitkomst bevestigen — geen afzonderlijk resultaat beschikbaar; handmatig uitvoeren is in deze omgeving niet toegestaan
- [ ] Naar Knaakie met openstaande bedragen browsertesten — gecontroleerde afgelopen reis heeft geen openstaande bedragen; filter en einddatumregels wel getest
- [x] Stap 3 agenda (.ics): persoonlijke link, intrekken, Reis-menu, tests; TripSettings-label en workflowchecks

- [x] Startscherm: actieve/laatste reis openen, Mijn reizen vereenvoudigen en voortgang alleen op Overzicht
- [x] Startscherm: 148 tests geslaagd; lint 0 fouten/18 bestaande waarschuwingen; automatische build OK
- [ ] Startscherm: afzonderlijke typecheck nog niet geverifieerd
- [x] Startscherm: ingelogd op 390px en desktop gecontroleerd in deze lay-outcorrectieronde

- [x] Homepage: functies en vier stappen onderscheiden, dubbele uitleg schrappen
- [x] Bestaande Signal-stijl en directe toon doortrekken naar overige schermen
- [x] 102 tests geslaagd, lint 0 fouten/18 waarschuwingen, automatische build OK; homepage, inloggen en Pro mobiel/desktop gecontroleerd
- [ ] Overige schermen ingelogd visueel controleren — geblokkeerd: geen beschikbare sessie voor de verzoeker
- [ ] Logo in live preview controleren — lokale controle kan de beheerde afbeeldingslink niet laden

- [x] Beheer (ops) overzetten naar de nieuwe merkstijl
- [x] Proefrun testaccount: actieve reis "Proefrun Toscane" aangemaakt en schermen bekeken
- [x] Nieuw logo (V met routepunt) toegepast + favicon bijgewerkt
- [x] Homepage: nieuwe kop en menselijkere Hansie-tekst
- [x] Hansie als geïntegreerde balk boven de tripnavigatie toegepast
- [x] Logo 01 (primair) en icoon 05 uit de aangeleverde set toegepast
- [x] 102 tests geslaagd; lint zonder fouten (18 waarschuwingen); automatische build OK; homepage mobiel/desktop gecontroleerd
- [x] Homepage: gratis versus Pro duidelijk gemaakt met echte grenzen (1 reis, 5 documenten, 12 Hansie-vragen; Pro: onbeperkt reizen, 200 documenten, 150 Hansie-vragen)
- [x] Homepage: stap 4 "Onderweg kijkt Hansie mee" en functies reizigerswensen + meldingen toegevoegd; connectorlijn netjes gestopt
- [x] Hansie ingelogd visueel gecontroleerd binnen contentkolom; verborgen op Mijn reizen, Profiel en gearchiveerde reis
- [x] Homepage: "Waarom Vakansie?"-blok en losse documentvraag verwijderd; FAQ rijker (9 vragen) en uitklapbaar; nieuwe test + 102 tests, lint, typecheck, build OK
- [x] Reis: één Toevoegen-menu, filters alleen bij inhoud, waarschuwingen ingeklapt
- [x] Overzicht: "x/y geregeld" telt lege reis en nachten zonder verblijf niet meer als geregeld
- [x] Dubbele Hansie-blokken verwijderd; één geïntegreerde vraagbalk past zich aan per scherm aan
- [x] Geïntegreerde Hansie-balk ingelogd op telefoon bekeken

- [x] Koppelingen stap 1: Open in Kaarten
- [x] Koppelingen stap 2: Verrekenen heet nu Knaakie, met betaalverzoek (delen/WhatsApp/kopiëren) en privé-IBAN in Profiel
- [x] Stap 4 weer: MET Norway + Nominatim, weerstrook op Overzicht, weer voor Hansie, actieve agenda-link tonen
- [x] Verblijfsideeën: kandidaten als idee, winnaar op tijdlijn, ideeën apart op Reis, buiten-reisdata waarschuwing en meeschuiven, rustigere rijen, weerstrook Toscane opgelost
- [x] Koppelingen stap 5: herinneringen via push en e-mail (elke 15 min, max 3 per dag, stille uren)
- [x] Afronding stap 5: herinneringsschema in repository, lintpunten, Koppelingen in AGENTS.md
- [ ] Stap 5 echt testen: pushmelding op Android/desktop en iPhone-beginscherm, e-mail na DNS-verificatie

## Afronding stap 5 en livegang
- [x] Testmelding beperkt tot 3 per uur per gebruiker
- [x] Livegang-rapport in docs/LIVEGANG_RAPPORT.md
- [ ] Openstaande punten product owner: zie "Te doen" in het livegang-rapport

## Privacy-ronde vóór livegang
- [x] Account zelf verwijderen in Profiel (e-mailbevestiging, organisator-overdracht, solo-reizen met documenten weg, admin geblokkeerd, log zonder e-mail)
- [x] Dieet en allergieën alleen met toestemming; Hansie krijgt ze alleen met toestemming
- [x] Privacyverklaring herschreven (placeholders bedrijfsgegevens nog invullen)
- [x] Runtime dependency audit op Node 22
- [ ] Account verwijderen echt doorlopen met een testaccount

- [x] Aan de slag: afvinklijst op Mijn reizen (5 stappen organisator, 3 voor reisgenoot), verbergen per gebruiker, verdwijnt als alles af is; ai_usage_events SELECT-policy via migratie 0013; 239 tests, typecheck, build en lint OK; ingelogd gecontroleerd op /trips
- [x] Uitlegpagina /uitleg uit planonderdeel 5 geschrapt: homepage-stappen en FAQ dekken die uitleg al

## UX-ronde reisschermen
- [x] "Dit wordt het" kiest het verblijf: andere verblijf-ideeën weg, keuze "Waar verblijven we?" dicht, ongedaan maken
- [x] Mobiele bovenbalk: Home-icoon, reiswisselaar, ⋯ met Reisinstellingen/Zet in je agenda/Nieuwe reis
- [x] Geen grote paginatitel; grijze regel met outline "+ Toevoegen" op Reis en Samen; neutrale Hansie-verzendknop
- [x] Reis: filters vanaf 6 onderdelen, geen 0-chips, Status-menu, geen streepje bij één onderdeel, nette aanbiedernamen, lege staat met alleen ideeën

## Keuze-ronde
- [x] "Dit wordt het" via server-transacties choose_trip_idea / undo_trip_idea_choice; alleen organisator of admin; ongedaan maken binnen 10 minuten
- [x] Reisgenoten zien "De organisator kiest; stem mee via Samen" bij een open keuze
- [x] Overzicht-icoon LayoutDashboard; korte datumregel; desktop geen dubbele reisnaam; tijdlijnlijn alleen tussen onderdelen
- [ ] Echte rechten-test in de database (organisator / reisgenoot / maker terug) — testomgeving staat alleen lezen toe

## Duidelijkere UI door alle lagen
- [x] Stap 1: lijsten als lichte kaarten, witte vlakken, grotere afronding en pictogrammen op alle klikbare rijen
- [x] Stap 3 (deels): Reis heeft directe toevoegknoppen per type
- [ ] Stap 2: Overzicht als vakantiedashboard
- [ ] Stap 4: Samen en Knaakie stroomlijnen
- [ ] Stap 5: ingelogd mobiel/desktop nalopen
