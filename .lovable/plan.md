
# Plan: Pieter toevoegen als 6e deelnemer

## Samenvatting
Pieter wordt toegevoegd als nieuwe deelnemer. Dit raakt meerdere onderdelen: account, vluchtinfo, groepsgrootte, accommodatie-eisen, vervoerskosten, en de speciale golf-logica in de intake.

## Wat er verandert

### 1. Nieuw account aanmaken
- Toevoegen aan de `seed-users` edge function: `pieter@local.app` / `zwarteweduwe`
- Toevoegen aan de `USERNAME_EMAIL_MAP` in `src/lib/auth.tsx`
- Account aanmaken in de database via de seed-functie (of direct via SQL)

### 2. Vluchtinformatie updaten
Op twee plekken worden de vluchten getoond:

**Info-pagina (`src/pages/Info.tsx`):**
- Heenvlucht Pieter: "(nog) onbekend" toevoegen als aparte regel
- Terugvlucht: Pieter toevoegen aan "Zo-ochtend: Allen"
- Groepsgrootte: "5 volwassenen" wordt "6 volwassenen"
- Koptekst: "5 man. 1 verblijf." wordt "6 man. 1 verblijf."

**Intake-pagina (`src/pages/Intake.tsx`):**
- Vluchtoverzicht in sectie A: Pieter's vlucht toevoegen als "(nog) onbekend"
- "5 volwassenen" wordt "6 volwassenen"

### 3. Vervoerskosten herberekenen
Met 6 personen veranderen de p.p. bedragen op de Info-pagina:
- **Busje**: totaalprijs blijft gelijk (EUR 265-470), maar p.p. wordt EUR 44-78 (was EUR 53-94)
- **Taxi/transfer**: mogelijk iets hoger totaal door extra persoon. Wordt aangepast naar EUR 220-380 totaal, en extra lokale ritten berekend voor 6 personen

### 4. Accommodatie max_guests updaten
Alle accommodaties moeten opnieuw bekeken worden: de groep is nu 6 personen i.p.v. 5. De `max_guests` check en vaste-bedden-check in `src/lib/scoring.ts` moet aangepast worden:
- `fixed_beds_count < 5` wordt `fixed_beds_count < 6`
- Dit betreft regel in `checkEligibility()`

### 5. Pieter's speciale golf-logica in de Intake
Net als Edwin mag Pieter niet stemmen op 2 of 3 rondes golf. Pieter krijgt een eigen knop:

- **Knop**: "Lounge tip Pieter" naast de "Eddie de Caddy" knop
- **Gedrag**: Alleen Pieter kan deze knop gebruiken. Bij klik opent een link naar `https://www.maxbeach.es/pool-beach` in een nieuw tabblad
- **Andere gebruikers**: krijgen een popup als ze erop klikken (vergelijkbaar met Edwin's "HEET JIJ ED?!")
- **Pieter op 2/3 rondes knoppen**: krijgt een waarschuwing, net als Edwin
- De grid wordt `grid-cols-4` (of 2x2) om 4 knoppen te tonen

### 6. Login-pagina tekst
- De subtekst "5 man" wordt "6 man" op de Login-pagina

## Technische details

### Database wijzigingen
- Nieuw gebruikersaccount via `seed-users` edge function aanroepen (of direct via admin API)
- Geen schema-wijzigingen nodig

### Bestanden die aangepast worden
1. **`supabase/functions/seed-users/index.ts`** -- Pieter toevoegen aan users array
2. **`src/lib/auth.tsx`** -- `pieter: "pieter@local.app"` toevoegen aan USERNAME_EMAIL_MAP
3. **`src/pages/Login.tsx`** -- "5 man" naar "6 man"
4. **`src/pages/Info.tsx`** -- Vluchtinfo, groepsgrootte, vervoerskosten p.p., koptekst
5. **`src/pages/Intake.tsx`** -- Pieter-ID constante, golf-logica (isPieter check), "Lounge tip Pieter" knop, vluchtinfo, groepsgrootte
6. **`src/lib/scoring.ts`** -- `fixed_beds_count < 5` naar `< 6`

### Bestaande data
Alle huidige locked submissions en accommodaties blijven ongewijzigd.
