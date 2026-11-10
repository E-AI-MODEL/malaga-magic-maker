# Reis en Samen samenvoegen tot één Reis-scherm

Uitgangspunt: jouw document en de mock-up. Vorm blijft Vakansie (grote foto, oranje accent, tactiele tegels). Geen database-, rechten- of betaalwijzigingen.

## Wat je gaat zien

**Reis (nieuw, één scherm)**
1. Grote reisfoto met naam, bestemming en afteller (bestaande hero, niet kleiner).
2. Compacte rij reizigers: eerste paar initialen, daarna "+N" en een knop "Nodig uit" (bestaande uitnodigingen en rollen).
3. Twee grote schakelknoppen: **Planning** en **Te doen (N)**. Actieve knop oranje met diepte, andere wit.
4. **Planning** (standaard open)
   - Lege reis: drie tegels Vervoer, Verblijf, Activiteiten met "Nog niets ingepland".
   - Gevulde reis: de bestaande tijdlijn centraal.
   - Eén knop "+ Plannen" die de bestaande opties opent (bon/boeking scannen, handmatig).
   - Bij een onderdeel met lopende stemming: "Stemming loopt · 2 van 4 gestemd" + "Stem nu", die direct naar die keuze in Te doen springt. Een stemming telt nooit als boeking.
   - Documenten en Reisinstellingen blijven onderaan bereikbaar.
5. **Te doen**: de bestaande Taken en Keuzes uit Samen, met alle huidige acties (aanmaken, toewijzen, afronden, stemmen, afsluiten, deadlines). Statusregels in de levende taal blijven. Het getal = open taken + keuzes waar jij nog moet stemmen, zonder dubbeltelling.

**Footer**: Overzicht · Reis · Knaakie · Hansie · Profiel. Samen verdwijnt als knop. Knaakie blijft een eigen scherm; de Knaakie-ingang op Samen vervalt.

**Oude links**: `/trip/:id/samen` gaat naar Reis → Te doen; `?section=tasks` en `?section=decisions` openen Te doen op de juiste plek; `?section=expenses` opent Knaakie voor die reis.

## Controle voor oplevering
Op telefoonformaat bekijken met: lege reis, reis met meerdere boekingen, open en afgeronde taken, lopende en gesloten stemming, meerdere reizigers en reizen. Navigatie, Knaakie en Hansie doorklikken, oude links testen. Tests, typecheck, lint en build. Eerst preview ter beoordeling, niet zelf publiceren.

## Technische details
- `TripReis.tsx`: header, reizigersrij en tab-schakelaar (`?tab=planning|todo`) toevoegen; Planning = bestaande inhoud. Te doen hergebruikt de taken/keuzes-secties uit `TripSamen.tsx`, uitgelicht naar een gedeeld component (geen herbouw van logica).
- Te-doen-teller als pure functie met unit-tests (geen dubbeltelling, ideeën tellen niet als boeking).
- Koppeling stemming ↔ onderdeel via bestaand decision-type/categorie; geen nieuwe kolommen. Ontbreekt een koppeling, dan geen badge.
- `TripSamen.tsx` wordt een redirect naar Reis met juiste tab/sectie; route blijft bestaan.
- `BottomNav.tsx`: nieuwe vijf items; Hansie-knop opent bestaand paneel met huidige reis. Contracttests bijwerken.
- AGENTS.md: regel over Samen/tegeloverzicht vervangen door de nieuwe indeling.
