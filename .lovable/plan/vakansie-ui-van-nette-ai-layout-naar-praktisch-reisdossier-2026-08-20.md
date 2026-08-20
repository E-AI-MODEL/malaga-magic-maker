# Vakansie UI: van "nette AI-layout" naar praktisch reisdossier

Uitgangspunt uit het onderzoek naar TripIt, Wanderlog, Airbnb Trips, Notion Calendar en Linear:
organizer-apps winnen op **dichtheid, scanbaarheid en directe acties**, niet op foto's en uitleg.
Wat de app nu doet — foto-hero, kaartje, sectielabel, uitlegzin, rij, herhalen — is precies het patroon
dat in 2026 als generiek wordt herkend. Dat gaan we omdraaien: **menu's en lijsten die werken**,
één sfeermoment per reis, en Hansie die meewerkt in het scherm.

## Wat er nu misgaat

- Elke pagina heeft dezelfde opbouw: `SectionLabel` + wit kaartje + rijen. Vijf keer per scherm.
- Veel uitlegtekst die na één keer lezen alleen nog ruimte kost ("Hansie gebruikt alleen deze reis als context").
- Twee foto-hero's achter elkaar op de home (welkomsthero én reishero) plus een genummerde uitleglijst.
- De tijdlijn op Reis is een platte rij zonder tijdkolom, dagplakkers of verbindingslijn.
- Samen en Reis hebben geen zichtbaar menu; alles is scrollen.
- Legacy Malaga-pagina's met emoji's hangen nog in de routes.

## Nieuwe ontwerpregels

1. **Eén beeld per reis.** Foto alleen boven een geopende reis. Home krijgt compacte rijen met een kleine thumbnail.
2. **Rijen, geen kaartjes.** Haarlijnen en dagbanden in plaats van witte blokken met schaduw. Rijhoogte 56–64px, raakvlak minimaal 44px.
3. **Cijfers in kolom.** Tijden, bedragen en aantallen tabulair en uitgelijnd.
4. **Kort.** Sectielabels max 3 woorden, tweede regel max één regel. Uitleg verhuist naar lege staten en de helpsheet.
5. **Zichtbare menu's.** Elke werkpagina krijgt bovenaan een vast segmentmenu en, waar nuttig, filterchips.
6. **Toon.** Kort, direct, "je". Geen enthousiaste assistent-taal.

## Per scherm

### Mijn reizen
- Slanke kop, daaronder direct **de volgende reis** als één brede rij: kleine bestemmingsfoto (72px), naam, datums, aftelling, dunne voorbereidingsbalk en maximaal drie aandachtspunten eronder.
- Daarna alle andere reizen als gewone rijen, archief inklapbaar.
- Welkomsthero en de genummerde "Zo werkt het"-uitleg verdwijnen; voor een leeg account komt er één korte lege staat met één knop.

### Reis (geopende reis, overzicht)
- Compacte kop: foto max 140px met naam, datums en aftelling erin, daaronder een strook met **aantallen** (onderdelen · taken · keuzes · documenten) als aanklikbare waarden.
- Daarna direct "Voor jou" en "Vraagt aandacht" als rijen. Geen herhaalde witte kaders.

### Reis (tijdlijn)
- Volwaardige agenda-tijdlijn: plakkende dagkoppen, linker tijdkolom van 52px met tabulaire tijden, verticale verbindingslijn, type-icoon, titel en één metaregel.
- Rij uitklappen voor boekingsnummer, locatie en link. Veegacties voor bewerken en verwijderen.
- Bovenaan een filterrij (Alles · Vervoer · Verblijf · Activiteiten · Documenten) in plaats van de losse toevoegchips; toevoegen wordt één vaste knop.
- "Nog niet ingepland" blijft onderaan als eigen groep.

### Samen
- Vast segmentmenu bovenin (Taken · Keuzes · Kosten · Reizigers) dat blijft staan bij scrollen.
- Taken: dichte rijen met verantwoordelijke rechts, afvinken via veegactie.
- Kosten: bedragen rechts uitgelijnd en tabulair, saldo bovenaan in één regel.

### Hansie (beide vormen)
- **In het scherm:** suggestierijen tussen je taken en tijdlijn, herkenbaar aan een fijne accentrand en het label "Hansie", met "Toevoegen" en "Negeren" in de rij zelf. Plus actiechips onder losse onderdelen.
- **De vraagbalk blijft**, maar wordt smaller en rustiger, met suggesties die passen bij het scherm waar je staat.
- Bij meerdere suggesties tegelijk: een korte controlelijst waarin je per regel aan- of afvinkt en in één keer toevoegt.

### Beheer
- Blijft apart en operationeel: dichtere tabelrijen, geen consumentenkaders.

### Legacy
- De oude Malaga-routes (Intake, Uitslag, Taken, Wensen, Accommodaties, Admin) worden losgekoppeld uit de router. Bestanden blijven staan, emoji's verdwijnen daarmee uit de bereikbare app.

## Technisch

- Nieuwe primitives in `src/components/primitives.tsx`: `Segmented` (plakkend), `DenseRow`, `DayHeader`, `TimeGutter`, `StatStrip`, `SuggestionRow`, `SwipeRow`. `Surface` wordt spaarzamer gebruikt.
- Tokens in `src/index.css`: dagbandkleur, tabulaire cijfers standaard voor tijd/geld, rijhoogtes.
- Herschrijven: `src/pages/Trips.tsx`, `TripHome.tsx`, `TripReis.tsx`, `TripSamen.tsx`, `src/components/HansieWidget.tsx`, `src/components/AppLayout.tsx`, `BottomNav.tsx`.
- Suggesties van Hansie worden in deze ronde afgeleid uit de bestaande readiness-data; geen nieuwe tabellen, geen backend-, RLS- of Edge Function-wijzigingen.
- Routes uitkoppelen in `src/App.tsx`; bestanden blijven.
- Afsluiten met typecheck, lint, de bestaande contracttests en een productiebuild; visuele controle op 390px.

## Volgorde

1. Tokens en primitives
2. Mijn reizen
3. Geopende reis + tijdlijn
4. Samen
5. Hansie (rijen, chips, vraagbalk)
6. Legacy loskoppelen en verificatie
