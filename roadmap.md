# Roadmap

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
