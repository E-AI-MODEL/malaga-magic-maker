# Accommodatie zoeken met Hansie

Hansie helpt bij het vinden van een verblijf: zoeken op basis van de reisgegevens én losse links (Booking, Airbnb, Micazu, Google) uitlezen. Kandidaten komen op een shortlist, kunnen als groepskeuze in stemming en na de knoop met één tik als verblijf op de tijdlijn.

## Wat de gebruiker krijgt

**Op Reis → Verblijf**
- Knop "Verblijf zoeken". Hansie gebruikt bestemming, data, aantal reizigers en (optioneel) budget en wensen als startpunt; die velden zijn aanpasbaar voor je zoekt.
- Resultatenlijst in de dossierstijl: naam, plaats, indicatieprijs, bron (Booking / Airbnb / Micazu / web), link naar de aanbieder. Prijs is altijd een indicatie; ontbreekt die, dan "Prijs nog onbekend".
- Knop "Link uitlezen": plak een Booking/Airbnb/Micazu-link, Hansie haalt naam, plaats, foto en prijsindicatie op. Werkt ook als los pad zonder zoeken.

**Per kandidaat twee acties**
- "Naar shortlist / stemmen" → maakt (of vult) een Keuze in Samen met de kandidaat als optie, inclusief bron-link.
- "Als verblijf toevoegen" → maakt een verblijf-item op de tijdlijn met check-in/check-out uit de reisdata, plaats en boekings-URL.

**Belangrijk voor verwachtingen**
- Vakansie boekt niets en toont geen live beschikbaarheid. Elke kandidaat verwijst naar de aanbieder; prijzen zijn indicatief met tijdstempel.
- Airbnb blokkeert crawlers actief. Zoeken levert daar vaak weinig op; losse Airbnb-links uitlezen lukt meestal wel. De UI zegt dit rustig ("geen resultaten van deze bron") in plaats van een fout te tonen.

## Technisch

**Nieuwe Edge Function `accommodation-search`** (`verify_jwt = false`, token- en membershipcheck in code, zelfde patroon als `document-extract`):
1. valideert token, haalt user op, controleert trip-membership op de meegegeven `tripId` (anders 403);
2. verbruikt Hansie-quota via `consume_hansie_quota` (admins onbeperkt, zoals nu);
3. valideert input met Zod (bestemming, data, gasten, budget, bronnen);
4. Firecrawl `search` per gekozen bron (`site:booking.com`, `site:airbnb.*`, `site:micazu.nl`, plus vrije webzoek), met `scrapeOptions.formats: ['markdown']`;
5. laat het Lovable AI-gateway-model de ruwe resultaten normaliseren naar `{name, location, price, currency, priceNote, url, source, imageUrl}`;
6. geeft de kandidaten terug; schrijft niets naar de database.

**Uitbreiding bestaande `firecrawl-scrape`**: nu admin-only. Er komt een tweede pad voor trip-leden dat alleen een URL mag uitlezen (membership + quota, geen adminrol), of anders een aparte `accommodation-lookup`-route binnen de nieuwe function. Ik houd één function aan: `accommodation-search` krijgt zowel een `search`- als een `lookup`-modus; `firecrawl-scrape` blijft ongewijzigd admin-only.

**Firecrawl-modus**: de gekoppelde connectie draait in directe API-modus (`uses_connector_gateway: false`), dus `Authorization: Bearer ${FIRECRAWL_API_KEY}` tegen `api.firecrawl.dev/v2`. Geen gateway-headers.

**Frontend**
- `src/features/travel/AccommodationSearchSheet.tsx` (nieuw): zoekformulier, resultatenlijst, lookup-veld, twee acties per kandidaat. Hergebruikt de primitives en de sheet-opzet van `BookingPasteSheet`.
- `src/features/travel/accommodation.ts` (nieuw): client-aanroep, types en het omzetten van een kandidaat naar een suggestie.
- `src/pages/TripReis.tsx`: ingang "Verblijf zoeken" naast "Boeking plakken".
- Kandidaat → tijdlijn hergebruikt de bestaande `createItemFromSuggestion`-helper in `src/features/documents/data.ts`; kandidaat → keuze gebruikt de bestaande `create_decision_with_options` RPC.

**Geen databasewijzigingen.** De legacy `accommodations`-tabel (Malaga) blijft ongemoeid; shortlist loopt via `decisions` + `decision_options`, verblijf via `trip_items`.

## Buiten scope
- Boeken, betalen of live prijzen/beschikbaarheid.
- Prijsbewaking of automatische herhaalde crawls.
- Affiliate-links.
