# Repo check: uitkomst en opruimvoorstel

## Wat groen is
- Typecheck: geen fouten.
- Tests: 19 bestanden, 84 tests, allemaal geslaagd.
- Lint: 0 errors, 113 warnings (vooral `any` en twee hook-dependency-waarschuwingen).

## Wat opvalt
1. **Dode legacy-code staat nog in de repo.** Deze bestanden worden nergens meer geïmporteerd en horen bij de oude Malaga-opzet:
   `src/pages/` — Uitslag, Wensen, Intake, Admin, Taken, TaskContext, Accommodations, AccommodationDetail, Kosten, Reisplanner, Info, BootSequence, Index, Onboarding.
   Plus losse restanden buiten `src/`: map `.build06/` en de bestanden `.build06-trigger`, `.build06-trigger2`.
2. **Bijna alle lint-warnings komen uit precies die dode bestanden.** Verwijderen lost het grootste deel van de ruis in één keer op.
3. **Componenten die alleen door die pagina's gebruikt werden** (bijvoorbeeld DilemmaGame, POIMatrix, VoteOverviewTable, AdminPOIManager, BulkImportAccommodations, AdminAccommodationForm, AdminEditSubmission, usePOIData, scoring, labelMaps) zijn kandidaat om mee te verdwijnen; dat wordt per bestand geverifieerd voordat er iets weg gaat.
4. **Meerdere databasetype-bestanden naast elkaar**: `database.live.ts` is in gebruik, `database.ts`, `database-build06.ts` en `types.ts` zijn kandidaat voor opruiming — alleen na controle op imports.

## Voorstel
Bounded opruimactie, geen functionele of visuele wijzigingen:
1. Per bestand controleren of het echt nergens wordt geïmporteerd (inclusief tests).
2. Alleen bewezen ongebruikte legacy-pagina's, hulpbestanden en trigger-restanden verwijderen. Routes in `App.tsx` blijven zoals ze zijn (de oude paden verwijzen al door naar `/trips`).
3. Resterende lint-warnings in actieve code (twee hook-dependency-meldingen in `TripSamen.tsx`) netjes maken.
4. Afsluiten met typecheck, lint, tests en productiebuild, en rapporteren wat er is verwijderd.

## Technisch
Verwijderen gebeurt met `rm`/`git rm`-equivalent via de shell; geen migraties, geen databasewijzigingen, geen edge-functionwijzigingen, geen deploy. De contracttests (`src/test/*contract.test.ts`) blijven de bewaker: als een verwijderd bestand toch nog verwacht wordt, faalt de suite en draai ik het terug.
