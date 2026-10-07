# Formulier-schermen (sheets) restylen in Signal-stijl

## Probleem
Het "Nieuwe taak"-scherm (en vergelijkbare formulieren) oogt rommelig: kale grijze achtergrond, standaard select-velden met browser-pijltjes, vlakke witte invoervakken en taal die niet bij de merkstijl past.

## Gevonden formulieren met dezelfde opbouw
- `src/features/together/TaskSheet.tsx` — Nieuwe taak / Taak wijzigen
- `src/features/together/DecisionSheet.tsx` — Nieuwe keuze
- `src/features/together/ExpenseSheet.tsx` — Kosten toevoegen / wijzigen
- `src/features/travel/TripItemSheet.tsx` — Reisitem toevoegen
- `src/features/documents/DocumentUploadSheet.tsx` — Document toevoegen
- `src/features/travel/BookingPasteSheet.tsx` — Boeking plakken
- `src/features/travel/AccommodationSearchSheet.tsx` — Verblijf zoeken
- `src/features/travelers/TravelerProfileSheet.tsx` — Wensen per reiziger

## Aanpak
1. **Gedeelde sheet-basis**: maak één herbruikbare opbouw voor formulier-sheets (titel in display-font, korte hulpzin, consistente veldopmaak) zodat alle acht formulieren er hetzelfde uitzien.
2. **Visuele stijl**: warme off-white sheet-achtergrond, duidelijke labels, invoervelden met dezelfde randen/hoeken als de rest van de app, primaire knop in signaaloranje. Geen kale browser-selects meer: vervang door de bestaande Select-component of gestylede keuzeknoppen.
3. **Taal**: hulpzinnen en labels aanscherpen naar de directe Vakansie-toon (kort, menselijk, geen filler). Bijv. "Maak duidelijk wat nog moet gebeuren en wie het oppakt." → korter en concreter.
4. **Mobiel eerst**: velden blijven binnen 390px, datumvelden lopen niet uit het scherm, min-font-size 16px tegen iOS-zoom.

## Buiten scope
- Geen wijzigingen aan data-logica, validatie of API's.
- HansieWidget en NotificationCenter blijven ongemoeid (geen formulieren).

## Technische details
- Nieuwe gedeelde wrapper (bijv. `src/components/FormSheet.tsx`) of gedeelde classnames; bestaande shadcn Sheet blijft de basis.
- Native `<select>`-elementen vervangen door de shadcn Select-component voor consistente pijltjes en stijl.
- Bestaande tests draaien; waar een contracttest copy vastlegt, wordt die bijgewerkt.

## Verificatie
- Typecheck, build, tests.
- Mobiele screenshots (390px) van minimaal TaskSheet, ExpenseSheet en TripItemSheet ter controle.
