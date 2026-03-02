
# Admin Dashboard Extreme Update + Titel Fix

## Probleem 1: Titel "Malaga Afvalrace"
De header in `AppLayout.tsx` toont al correct "Malaga". De Info-pagina hero toont "5 man. 1 verblijf. 3 nachten Costa del Sol." -- geen "Afvalrace" zichtbaar. De "Afvalrace controls" sectie op het admin dashboard (regel 384) bevat deze term. Deze wordt hernoemd naar "Selectieronde controls" of vergelijkbaar.

## Probleem 2: Admin Dashboard is incompleet

### Huidige staat
Het dashboard toont momenteel:
- Deadline beheer (basis)
- Completion status (locked/niet locked)
- Gebruikersactiviteit (basis: logins, pageviews, timeline)
- Stemverdeling (alleen rondes, mobiliteit, base, vaste bedden, 3 slaapkamers)
- Gemiddelde punten (bar chart)
- Afvalrace controls + accommodatielijst
- Override log

### Wat ontbreekt
1. **Per-gebruiker intake details**: de admin kan niet zien WAT een gebruiker precies heeft ingevuld (vervoer, locatie, wensen, diet, activiteiten, punten, budget, opmerkingen)
2. **Groepsoverzicht van alle intake-velden**: stemverdeling mist pool, airco, wifi, parking, terras, budget caps, eetvoorkeuren, activiteiten
3. **Admin kan niks aanpassen**: geen mogelijkheid om submissions te unlocken en herkalibreren, of om individuele velden te wijzigen
4. **Geen export / totaaloverzicht**: geen samenvatting van de groepsbeslissingen

---

## Plan

### 1. Fix "Afvalrace" referenties
- `Admin.tsx` regel 384: "Afvalrace controls" wordt "Selectieronde"

### 2. Groepsoverzicht uitbreiden (stemverdeling)
Voeg toe aan de bestaande stemverdeling sectie:
- **Pool**: vereist vs niet (countVotes require_pool)
- **Airco**: vereist vs niet
- **Wifi**: vereist vs niet
- **Parking**: vereist vs niet
- **Terras**: vereist vs niet
- **Transparante prijs**: vereist vs niet
- **Budget caps**: overzicht van ingevoerde bedragen + mediaan/gemiddelde
- **Max reistijd**: verdeling per waarde (10/15/20/30 min)
- **Eetvoorkeuren**: hoe vaak elk dieet-item is gekozen (bar/badge per item)
- **Activiteiten**: hoe vaak elke activiteit is gekozen
- **Opmerkingen**: lijst van alle opmerkingen per gebruiker

### 3. Per-gebruiker detailweergave (nieuw)
Onder de bestaande "Gebruikersactiviteit" sectie, of als nieuwe tabbladen per gebruiker, een uitklapbaar paneel met:
- **Alle intake-antwoorden**: vervoer, locatie, max reistijd, alle wensen (checkboxes), budget, punten, eetvoorkeuren, activiteiten, opmerkingen
- **Puntenverdeling** als mini bar chart per gebruiker
- Vergelijking met groepsgemiddelde

### 4. Admin-acties per gebruiker
- **Unlock submission**: bestaat al, behouden
- **Overzicht wie nog niet heeft ingevuld**: al zichtbaar, maar verduidelijken met call-to-action

### 5. Admin-acties globaal
- Bij elke accommodatie: meer info tonen (prijs, bedrooms, tags)
- Groepsregels samenvatting: toon de berekende GroupRules (wat de meerderheid heeft besloten) als duidelijk blok bovenaan

### 6. Scoring model updaten
Het `scoring.ts` Submission interface mist de nieuwe velden (require_pool, require_airco, etc.). De GroupRules en eligibility checks moeten worden uitgebreid:
- Voeg `requirePool`, `requireAirco`, `requireWifi`, `requireParking`, `requireTerrace` toe aan GroupRules
- Voeg eligibility checks toe: als meerderheid pool eist, moet accommodatie "pool" tag hebben, etc.

---

## Technische details

### Bestanden

| Bestand | Actie |
|---|---|
| `src/pages/Admin.tsx` | Grote refactor: groepsoverzicht uitbreiden, per-gebruiker detail, admin-acties |
| `src/lib/scoring.ts` | Submission interface + GroupRules + eligibility uitbreiden met nieuwe velden |
| `src/components/AppLayout.tsx` | Geen wijziging nodig (titel is al "Malaga") |

### Admin.tsx nieuwe structuur

```text
+-----------------------------------------------+
| Admin Dashboard                               |
+-----------------------------------------------+
| 1. Deadline beheer (bestaand)                 |
+-----------------------------------------------+
| 2. Completion + per-user detail (uitgebreid)  |
|    Per gebruiker uitklapbaar:                 |
|    - Status (locked/bezig/niet gestart)       |
|    - Alle intake-antwoorden                   |
|    - Puntenverdeling (mini bars)              |
|    - Eetvoorkeuren + activiteiten             |
|    - Opmerkingen                              |
|    - Gedrag (logins, pageviews, timeline)     |
|    - [Unlock] knop                            |
+-----------------------------------------------+
| 3. Groepsresultaten                           |
|    - Berekende groepsregels (meerderheid)     |
|    - Stemverdeling ALLE velden               |
|    - Gemiddelde punten (bestaand)             |
|    - Budget overzicht                         |
|    - Eetvoorkeuren totaal                     |
|    - Activiteiten totaal                      |
|    - Alle opmerkingen                         |
+-----------------------------------------------+
| 4. Selectieronde controls (was Afvalrace)     |
+-----------------------------------------------+
| 5. Accommodaties (bestaand, meer info)        |
+-----------------------------------------------+
| 6. Override log (bestaand)                    |
+-----------------------------------------------+
```

### scoring.ts wijzigingen

- `Submission` interface: voeg `require_pool`, `require_airco`, `require_wifi`, `require_parking`, `require_terrace`, `diet_preferences`, `diet_remarks`, `activities`, `remarks_a`, `budget_cap_total` toe (sommige bestaan al)
- `GroupRules` interface: voeg `requirePool`, `requireAirco`, `requireWifi`, `requireParking`, `requireTerrace` toe
- `computeGroupRules`: bereken meerderheid voor de 5 nieuwe velden
- `checkEligibility`: voeg checks toe voor pool (tag "pool"), parking (parking === "yes"), etc.

### Geen database wijzigingen nodig
Alle benodigde kolommen bestaan al in de `submissions` tabel.
