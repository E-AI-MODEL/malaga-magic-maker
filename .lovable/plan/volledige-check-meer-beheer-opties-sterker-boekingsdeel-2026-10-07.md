# Volledige check + meer beheer-opties + sterker boekingsdeel

## 1. Volledige code check (eerst, rapport aan jou)

- Typecheck, lint, tests en productiebuild draaien; alle fouten en waarschuwingen oplossen.
- Security scan + database linter opnieuw draaien; nieuwe bevindingen melden en kleine fixes direct doen.
- Live doorloop als ingelogde gebruiker op 390px: Mijn reizen, Nieuwe reis, Overzicht, Reis, Samen, Profiel, Beheer. Console- en netwerkfouten noteren en oplossen.
- Losse eindjes verzamelen in `roadmap.md` (bijv. de oude seed-users functie die alleen nog "uitgeschakeld" teruggeeft verwijderen, ongebruikte code, ontbrekende lege/fout-staten).

## 2. Beheer: meer regie

Haalbaarheid: goed. Pro toekennen/intrekken bestaat al in Beheer > Gebruikers; we maken het completer.

- **Pro toekennen** uitbreiden: met reden en optionele einddatum (bijv. 30 dagen / 1 jaar / altijd), zichtbaar in het gebruikersoverzicht, met logboekregel.
- **Nieuwe gebruiker aanmaken**: formulier met naam + e-mail, keuze "uitnodigingsmail sturen" (aanbevolen, gebruiker kiest zelf wachtwoord) of "tijdelijk wachtwoord instellen". Optioneel meteen Pro geven en/of aan een reis toevoegen als reiziger of organisator.
- **Extra acties per gebruiker**: herstelmail versturen, account blokkeren/deblokkeren, beheerdersrol geven/afnemen (met bevestiging; je kunt jezelf niet uitsluiten).
- Alle acties worden vastgelegd in het Logboek.

## 3. Boekingen sterker (Reis-pagina)

- Duidelijke status per boeking: idee / gepland / geboekt / betaald / geannuleerd, met kleur en filter.
- Scraping / crawl zekerheid controleren 
- Per type de juiste velden (vlucht: vluchtnummer, vertrek/aankomst-luchthaven; verblijf: in-/uitchecken, adres; huurauto: ophalen/inleveren; activiteit/restaurant: tijd, locatie).
- Boekingsbevestiging plakken of als document uploaden -> Hansie vult een voorstel in dat je eerst controleert voordat het opgeslagen wordt.
- Documenten direct aan een boeking koppelen en vanuit de boeking openen.
- Kosten van een boeking met één tik als uitgave in Samen > Kosten zetten (met verdeling).
- Waarschuwingen in de tijdlijn: overlappende boekingen, ontbrekende overnachting tussen data, boeking zonder referentie.

## Technische details

- Nieuwe Edge Function `ops-admin-users` (service role): valideert token, controleert `has_role(admin)` server-side, daarna `auth.admin.inviteUserByEmail` / `createUser` / ban / recovery. Nooit vertrouwen op UI-zichtbaarheid.
- `ops_grant_pro` uitbreiden (nieuwe migratie) met `p_expires_at`; `entitlements.expires_at` bestaat al. Rolwijzigingen via security-definer RPC met audit in `admin_audit_log`, blokkade op het verwijderen van de laatste admin.
- Boekingsvelden in `trip_items.metadata` per type (geen nieuwe kolommen); statuswaarden via labelmapping. Koppeling document <-> item via bestaande `trip_documents.trip_item_id`. Uitgave via bestaande `create_expense_with_splits`.
- Overlap/gat-detectie als pure functie in `src/features/travel/presentation.ts` met tests.
- Types regenereren; AGENTS.md bijwerken met de admin-function regel.