# Livegang-rapport Vakansie

Peildatum: 9 oktober 2026. Alleen gelezen; er is niets omgezet en geen secret getoond.

## Betalen

| # | Punt | Huidige stand | Oordeel | Actie product owner |
|---|------|---------------|---------|---------------------|
| 1 | `PAYMENTS_ENVIRONMENT` en publishable key | Secret bestaat; is op 8 okt op `live` gezet (waarde kan niet worden teruggelezen). Productiebuild gebruikt `pk_live_`, preview/ontwikkeling `pk_test_`. | OK | Geen, tenzij je de preview ook live wilt laten afrekenen (niet aanbevolen). |
| 2 | Prijzen `vakansie_pro_2/5/10` live | Code accepteert alleen deze drie. Er is één live-betaling geslaagd, dus minstens één prijs bestaat live. Alle drie apart controleren kon vanuit hier niet. | LET OP | In het Stripe-dashboard (live) nagaan dat alle drie prijzen bestaan. |
| 3 | Live-webhook en `PAYMENTS_LIVE_WEBHOOK_SECRET` | Livegang-stappen staan allemaal op voltooid; webhook wordt automatisch aangemaakt. Secret ingesteld: ja. | OK | Geen. |
| 4 | `sandbox_pro_enabled`, `payments_enabled` | `false` / `true` | OK | Geen. |
| 5 | Entitlements per omgeving | live: 1, sandbox: 0 | OK | Geen. |

## Toegang en accounts

| # | Punt | Huidige stand | Oordeel | Actie product owner |
|---|------|---------------|---------|---------------------|
| 6 | `VITE_PRELAUNCH_ACCESS_MODE`, `signups_open` | `open` / `true`: iedereen kan zich aanmelden. | LET OP | Bewust laten staan als je openbaar gaat; anders `signups_open` uit in Beheer. |
| 7 | Auth Site URL, redirect-URL's, e-mailbevestiging | `ALLOWED_APP_ORIGINS` en `APP_URL` bestaan. Site URL, redirect-lijst en bevestigingsinstelling konden niet worden uitgelezen (niet geverifieerd). Alle 3 bestaande gebruikers zijn bevestigd. | LET OP | In Cloud → Users → Auth settings nagaan: Site URL `https://vakansie.app`, redirects voor vakansie.app/www/preview, e-mailbevestiging aan. |
| 8 | Gebruikers en admins | 3 gebruikers, 1 admin | OK | Geen. |

## Testdata

| # | Punt | Huidige stand | Oordeel | Actie product owner |
|---|------|---------------|---------|---------------------|
| 9 | Reizen die op test lijken | "Malaga 2026" (archived, 1 lid, 2026-03-01); "Proefrun Toscane" (planning, 1 lid, 2026-10-07). Geen reizen zonder leden. Totaal 5 reizen. | ACTIE NODIG | Beslissen of deze twee reizen weg mogen; daarna verwijderen via Beheer. |
| 10 | Testbetalingen en testgebruikers | 0 sandbox-entitlements; 3 gebruikers in totaal, geen aparte testaccounts herkend. | OK | Geen. |

## E-mail, push en taken

| # | Punt | Huidige stand | Oordeel | Actie product owner |
|---|------|---------------|---------|---------------------|
| 11 | Lovable Emails `notify.vakansie.app` | Domein geverifieerd; verzendpad meldt "nog niet klaar" (controle van het verzendpad liep vast op een time-out). | ACTIE NODIG | Een testmelding per e-mail sturen vanuit Profiel en kijken of die aankomt; zo niet, Cloud → Emails nakijken. |
| 12 | Cron `send-reminders-every-15-min` | Actief; laatste 5 runs geslaagd. | OK | Geen. |
| 13 | `reminders_enabled` | Niet ingesteld, dus standaard aan. | OK | Geen. |

## Beveiliging en kwaliteit

| # | Punt | Huidige stand | Oordeel | Actie product owner |
|---|------|---------------|---------|---------------------|
| 14 | Securityscan | Scan geeft geen bevindingen; de tool deed alleen de basiscontroles, een diepe codeanalyse was niet beschikbaar. Eerder geaccepteerde risico's: Hansie-gespreksgeschiedenis en accommodatie-URL-lookup. | LET OP | Diepe scan starten vanuit het Security-paneel. |
| 15 | Buckets privé | `trip-documents`, `task-attachments`, `accommodation-images`: alle drie privé. Niet in een migratie vastgelegd; een oude migratie maakt `task-attachments` nog publiek aan. Een nieuwe omgeving krijgt dus een publieke bucket. | LET OP | Accepteren, of de bucketinstelling bij een volgende infrastructuurronde laten vastleggen. |
| 16 | `npm audit --omit=dev` | Kon in deze omgeving geen resultaat geven (audit-dienst gaf geen cijfers terug). De laatste vastgelegde meting gaf 0 kritiek, 0 hoog. | LET OP | De GitHub-workflow "Runtime dependency audit" bekijken. |
| 17 | GitHub-workflows | Laatste runs niet in te zien vanuit hier. Quality gate gebruikt Node 22; Runtime dependency audit gebruikt nog Node **20**. | ACTIE NODIG | Runs bekijken op GitHub; de audit-workflow laten omzetten naar Node 22. |
| 18 | `/privacy` en `/terms` | Pagina's bestaan. Privacy noemt Stripe en AI; Lovable Cloud/Supabase, Gemini via Lovable, Firecrawl, MET Norway, OpenStreetMap/Photon en Lovable Emails worden niet genoemd. | ACTIE NODIG | Verwerkerslijst laten aanvullen (tekst laten nakijken door iemand met juridische kennis). |

## Te doen door de product owner vóór livegang

1. Privacyverklaring aanvullen met alle verwerkers (punt 18).
2. E-mail testen met de testmelding in Profiel; verzendpad in orde maken (punt 11).
3. Auth-instellingen nakijken: Site URL, redirects en e-mailbevestiging (punt 7).
4. In Stripe live controleren dat alle drie Pro-prijzen bestaan (punt 2).
5. Testreizen "Malaga 2026" en "Proefrun Toscane" opruimen (punt 9).
6. Diepe securityscan draaien en bevindingen beoordelen (punt 14).
7. GitHub-runs controleren en audit-workflow naar Node 22 (punt 16–17).
8. Bewust bevestigen dat aanmelden open blijft (punt 6) en de bucketinstelling accepteren of laten vastleggen (punt 15).
