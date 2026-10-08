# Tripoverzicht, gedeelde labels en Hansie-context aanscherpen

## Correctie op het voorstel

Het voorstel klopt grotendeels, met drie aanpassingen:

- De voortgangsring met `7/10 geregeld` komt **niet** terug. Dit volgt je eerdere besluit om `x/x geregeld` uit de interface te halen.
- `HansiePanel.tsx` is niet volledig ongebruikt: `HansieWidget` importeert er nog `HansieMark` uit. Die markering verhuist eerst naar de widget; daarna kan het ongebruikte paneelbestand weg.
- Er komt **geen SQL-migratie** voor `task-attachments`. De productie-bucket staat al op `public = false`, en bucketinstellingen mogen via de opslag-API worden gewijzigd, niet via een migratie op `storage.buckets`.

## Uitvoering

1. **Tripoverzicht rustiger en leesbaarder maken**
   - Reisnaam in normale hoofdletters/kleine letters tonen met `font-brand` op 24px.
   - Alleen de afteltekst groot en in hoofdletters houden.
   - Datumkolom verbreden zodat bijvoorbeeld `za 17 okt` op één regel blijft.
   - Alle gebruikte `/12`-achtergrondopaciteiten vervangen door `/10`.

2. **Dubbele persoonlijke acties verwijderen**
   - De sleutels van alle items in `Eerst dit` — zowel het eerste als de uitgeklapte items — uitsluiten van `Voor jou`.
   - `Voor jou` verbergen wanneer daarna geen items overblijven.
   - De deduplicatie als kleine pure functie vastleggen en met concrete gevallen testen.

3. **Gedeelde labels normaliseren**
   - `SectionLabel` en de labels in de onderste navigatie niet langer geforceerd in hoofdletters tonen.
   - De mobiele Hansie-balk een neutrale rand geven, zodat de primaire actie in `Eerst dit` het duidelijke oranje accent blijft.

4. **Hansie documentrelaties begrijpelijk maken**
   - Bij het opbouwen van de geautoriseerde reiscontext `trip_item_id` server-side koppelen aan de titel van het reisonderdeel.
   - Alleen `hoort_bij: <titel>` aan Hansie doorgeven; geen UUID of opslagpad.
   - Testen dat een gekoppeld document de juiste titel bevat en dat identifiers afwezig blijven.

5. **Ongebruikte Hansie-presentatie opruimen**
   - `HansieMark` onderbrengen bij de enige resterende gebruiker.
   - `HansiePanel.tsx` verwijderen zodra geen import meer bestaat.
   - De roadmap corrigeren: verouderde vermeldingen over losse prominente Hansie-blokken verwijderen en de actuele geïntegreerde balk en resterende visuele controle behouden.

## Technische controle

- Bestaande tests bijwerken waar zij nog op oude presentatie of dubbele items rekenen.
- De relevante functies en het gekoppelde documentgedrag testen.
- Build, lint, typecheck en volledige testsuite draaien.
- Mobiel op 390px controleren: header, datumregel, `Eerst dit`/`Voor jou`, sectielabels, navigatie en Hansie-balk.
- Geen databasewijziging uitvoeren voor `task-attachments`; de reeds bevestigde private status blijft ongewijzigd.
