# Fase 2: Verrekenen heet "Knaakie", met betaalverzoek

Stap 2 uit het document "Vakansie: vijf nieuwe koppelingen". Typecheck is al gedraaid en groen; de vorige stap (Open in Kaarten) is afgerond. Bounded build: alleen de onderdelen A, B en C hieronder, geen extra functies.

## Deel A — Nieuwe naam in klantteksten
- `src/pages/TripSamen.tsx`: sectielabel "Verrekenen" → "Knaakie". Lege-state-tekst aanpassen zodat die in dezelfde toon over Knaakie praat.
- De knop om een uitgave toe te voegen heet voortaan "Bonnetje toevoegen".
- `supabase/functions/trip-ai-chat/system-rules.ts`: fase "afgelopen" wordt "het Knaakie-deel: wie betaalt wie, en afronden". Function daarna deployen.
- Technische namen (settle.ts, computeBalances, transfers) blijven ongewijzigd.

## Deel B — Betaalverzoek
- In "Wie betaalt wie" krijgt elke regel waarin de ingelogde gebruiker geld krijgt een knop "Vraag om betaling".
  - De transfers opbouwen vanuit het standpunt van de huidige gebruiker: de eigen positie uit `computeBalances` bepaalt "jij krijgt van {naam} {bedrag}"; de bestaande `settleBalances`-transfers blijven staan zoals ze zijn.
- Nieuw sheet (`src/features/together/PaymentRequestSheet.tsx`, gebaseerd op de gedeelde FormSheet-basis) met de tekst:
  "Hoi {naam}, voor {reisnaam} krijg ik nog {bedrag} van je (jouw deel van de gedeelde kosten). {IBAN-regel}"
  - `{bedrag}` in nl-NL valutanotatie, in de valuta van de reis (bestaande money-helpers).
  - `{IBAN-regel}` alleen zichtbaar als de gebruiker zelf een IBAN heeft opgeslagen: "Je kunt het overmaken naar {IBAN} t.n.v. {naam rekeninghouder}."
- Drie knoppen in het sheet:
  - "Delen" via `navigator.share` (verbergen als `navigator.share` ontbreekt).
  - "WhatsApp" via `https://wa.me/?text=<tekst>`.
  - "Kopiëren" naar het klembord met toast "Gekopieerd".
- Regels waarin de gebruiker zelf moet betalen krijgen geen knop, alleen de bestaande tekst.
- Geen id's, e-mailadressen of documentgegevens in de tekst of de share.

## Deel C — IBAN (optioneel, privé)
- Nieuwe migratie met tabel `payment_details` (`user_id` uuid primary key, `iban` text, `account_name` text, `updated_at`):
  - `user_id` als kale uuid (geen foreign key naar auth.users, volgens de projectregels).
  - RLS aan: SELECT, INSERT, UPDATE, DELETE alleen op de eigen rij (`user_id = auth.uid()`). Geen enkele andere toegang, ook niet voor reisgenoten; grants alleen voor authenticated.
  - Gegenereerde types bijwerken.
- Profiel krijgt een blok "Betaalgegevens" met IBAN en rekeninghouder en de uitleg: "Alleen jij ziet dit. Het komt alleen in betaalverzoeken die jij zelf verstuurt." Knop "Verwijderen" wist de gegevens.
- IBAN-validatie als pure functie met mod-97-controle (`src/features/together/iban.ts`) plus tests; opslaan zonder spaties en in hoofdletters, tonen in groepjes van vier.
- Het IBAN gaat nooit naar Hansie, nooit naar andere gebruikers en nooit in logs.

## Kwaliteitspoort
- Unit-tests: betaalverzoek-tekst (met en zonder IBAN-regel, valutanotatie), IBAN mod-97 (geldige/niet-geldige voorbeelden, normalisatie).
- Daarna typecheck, lint, tests en productiebuild; deploy van `trip-ai-chat` na de systeemtekstwaarschuwing.
- `roadmap.md` bijwerken.
- Geen wijzigingen aan bestaande migraties, RLS-contracten of edge-functionlogica buiten de ene tekstregel.

## Technisch
- Nieuwe bestanden: `src/features/together/iban.ts`, `src/features/together/iban.test.ts`, `src/features/together/PaymentRequestSheet.tsx`, migratie voor `payment_details`.
- Aangepast: `src/pages/TripSamen.tsx` (labels + betaalverzoekknop), `src/pages/Profiel.tsx` (blok Betaalgegevens), `supabase/functions/trip-ai-chat/system-rules.ts`, `src/integrations/supabase/types.ts` (gegenereerd), `roadmap.md`.
- De betaalverzoektekst is een pure functie zodat de notatie testbaar is zonder browser.
