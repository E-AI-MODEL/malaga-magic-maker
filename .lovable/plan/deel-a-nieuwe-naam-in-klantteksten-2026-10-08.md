Fase 2: Verrekenen heet "Knaakie", met betaalverzoek

Stap 2 uit het document "Vakansie: vijf nieuwe koppelingen". Typecheck is al gedraaid en groen; de vorige stap (Open in Kaarten) is afgerond. Bounded build: alleen de onderdelen A, B en C hieronder, geen extra functies.

## Deel A — Nieuwe naam in klantteksten

- `src/pages/TripSamen.tsx`: sectielabel "Verrekenen" → "Knaakie". Pas de lege-state-tekst aan zodat die in dezelfde toon over Knaakie praat. Het kopje "Wie betaalt wie" blijft.

- De knop om een uitgave toe te voegen heet voortaan "Bonnetje toevoegen".

- `supabase/functions/trip-ai-chat/system-rules.ts`: de fase "afgelopen" wordt "het Knaakie-deel: wie betaalt wie, en afronden". Deploy de function daarna.

- Technische namen (settle.ts, computeBalances, settleBalances, transfers) blijven ongewijzigd.

## Deel B — Betaalverzoek

- Bouw de knop op de bestaande `settleBalances`-transfers, dezelfde lijst die nu bij "Wie betaalt wie" staat:

  - Bij elke transfer met `toUserId === huidige gebruiker` komt een knop "Vraag om betaling", met het bedrag van díe transfer.

  - Gebruik `computeBalances` niet voor bedragen per persoon. Die functie geeft alleen het nettototaal.

- Transfers waarin de huidige gebruiker zelf moet betalen `fromUserId === huidige gebruiker`) krijgen geen knop, alleen de tekst "Jij betaalt {naam} {bedrag}".

- Maak een nieuw sheet `src/features/together/PaymentRequestSheet.tsx`, gebaseerd op de gedeelde FormSheet-basis, met de tekst:

  "Hoi {naam}, voor {reisnaam} krijg ik nog {bedrag} van je (jouw deel van de gedeelde kosten). {IBAN-regel}"

  - `{bedrag}` in nl-NL valutanotatie, in de valuta van de reis (bestaande money-helpers).

  - `{IBAN-regel}` alleen als de gebruiker zelf een IBAN heeft opgeslagen: "Je kunt het overmaken naar {IBAN} t.n.v. {naam rekeninghouder}."

  - De tekst komt uit een pure functie `buildPaymentRequestText()`, zodat hij testbaar is zonder browser.

- Drie knoppen in het sheet:

  - "Delen" via `navigator.share`. Verberg deze knop als `navigator.share` ontbreekt.

  - "WhatsApp" via `https://wa.me/?text=<encodeURIComponent(tekst)>`, geopend in een nieuw tabblad met `rel="noopener noreferrer"`.

  - "Kopiëren" naar het klembord, met de toast "Gekopieerd".

- Geen id's, e-mailadressen of documentgegevens in de tekst of de share.

## Deel C — IBAN (optioneel, privé)

- Nieuwe migratie met de tabel `payment_details` `user_id` uuid primary key, `iban` text, `account_name` text, `updated_at` timestamptz default now()):

  - `user_id` als kale uuid, zonder foreign key naar auth.users (volgens de projectregels).

  - RLS aan: SELECT, INSERT, UPDATE en DELETE alleen op de eigen rij `user_id = auth.uid()`). Geen enkele andere toegang, ook niet voor reisgenoten of admins via de client. Grants alleen voor authenticated.

  - Werk de gegenereerde types bij.

- In dezelfde migratie: `CREATE OR REPLACE` van `ops_delete_user` zodat die ook de rij in `payment_details` van de verwijderde gebruiker wist. Laat de rest van de functie inhoudelijk gelijk.

- Profiel krijgt een blok "Betaalgegevens" met IBAN en rekeninghouder, en de uitleg: "Alleen jij ziet dit. Het komt alleen in betaalverzoeken die jij zelf verstuurt." De knop "Verwijderen" wist de gegevens.

- IBAN-validatie als pure functie met mod-97-controle `src/features/together/iban.ts`), plus tests. Sla het IBAN op zonder spaties en in hoofdletters, en toon het in groepjes van vier.

- Het IBAN gaat nooit naar Hansie, nooit naar andere gebruikers en nooit in logs. Zorg ook dat formulierwaarden uit Betaalgegevens niet worden meegestuurd in de foutregistratie `client_error_events`).

## Kwaliteitspoort

- Unit-tests:

  - De betaalverzoektekst, met en zonder IBAN-regel, en de valutanotatie.

  - De knop verschijnt alleen bij transfers naar de huidige gebruiker, met het juiste bedrag per persoon.

  - IBAN mod-97: geldige en ongeldige voorbeelden, plus normalisatie.

  - Een contractcheck dat `ops_delete_user` `payment_details` opruimt.

- Draai daarna typecheck, lint, tests en de productiebuild. Deploy `trip-ai-chat` na de wijziging in de systeemtekst.

- Werk `roadmap.md` bij.

- Geen wijzigingen aan bestaande migraties, RLS-contracten of edge-functionlogica, buiten de ene tekstregel en `ops_delete_user`.

## Technisch

- Nieuwe bestanden: `src/features/together/iban.ts`, `src/features/together/iban.test.ts`, `src/features/together/PaymentRequestSheet.tsx`, de migratie voor `payment_details` en `ops_delete_user`.

- Aangepast: `src/pages/TripSamen.tsx` (labels en betaalverzoekknop), `src/pages/Profiel.tsx` (blok Betaalgegevens), `supabase/functions/trip-ai-chat/system-rules.ts`, `src/integrations/supabase/types.ts` (gegenereerd), `roadmap.md`.