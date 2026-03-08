

## Plan: UX-opschoning — Labels, Iconen & Admin Polish

### Probleem
1. **Ruwe databasewaarden** worden getoond op Wensen, Uitslag en VoteOverviewTable: `eat_out`, `no_preference`, `self_cook`, `beach`, `padel` etc. in plaats van Nederlandse labels
2. **Emoji's** in Uitslag (⛳🏖️🗺️✨💰🧘🚗🚕🤷🍕) schenden de design-richtlijn: "sectie-labels en koppen zijn tekstueel zonder emoticons"
3. **Admin UX**: `prompt()` voor eliminatie, "Sloperhamer" jargon, ruis van login/pageview stats
4. **Budget**: outlier-filter ontbreekt op Wensen-pagina

---

### Aanpak

#### A. Gedeelde label-mappings (nieuw bestand)
Maak `src/lib/labelMaps.ts` met alle value→label mappings, zodat Intake, Wensen, Uitslag en Admin dezelfde labels gebruiken:

```text
DIET_LABELS:    eat_out → "Voorkeur uit eten"
                no_preference → "Geen voorkeur"  
                self_cook → "Voorkeur zelf koken"
                no_pork → "Geen varkensvlees"
                allergies → "Voedselallergieën"

ACTIVITY_LABELS: beach → "Strand / zwemmen"
                 padel → "Padel"
                 spa → "Spa / wellness"
                 hiking → "Wandelen / natuur"
                 nightlife → "Uitgaan / nachtleven"
                 sightseeing → "Bezienswaardigheden"
                 shopping → "Winkelen"
                 relaxing → "Gewoon relaxen"
```

#### B. Emoji's → Lucide-iconen (Uitslag.tsx)
- Prioriteiten: vervang `emoji` property door Lucide-iconen (al gedefinieerd in Wensen als `PRIORITY_ICONS`)
- Vervoer winnaar: vervang 🚗/🚕/🤷 door `Car`/`CarTaxiFront`/`Minus` iconen
- Lege states: vervang 🤷 en 🍕 door subtiele Lucide-iconen met `text-muted-foreground/30`

#### C. Wensen.tsx — labels + budget fix
- Dieet-sectie: gebruik `DIET_LABELS[diet]` i.p.v. raw key
- Activiteiten-sectie: gebruik `ACTIVITY_LABELS[act]` i.p.v. raw key
- Budget: filter outliers (>€100k) net als in Uitslag

#### D. Uitslag.tsx — labels
- Dieet en activiteiten secties: zelfde label-mappings toepassen

#### E. VoteOverviewTable.tsx — labels
- Controleren en raw keys vervangen door labels waar nodig

#### F. Admin.tsx — UX-verbeteringen
1. **`prompt()` → `AlertDialog`** bij eliminatie: textarea voor reden, bevestigingsknop
2. **Accommodatie-rij**: vervang `6k · 13b · 27m golf` door leesbare labels: `6 kamers · 13 bedden · 27 min golf`
3. **Selectieronde**: "Sloperhamer" → "Elimineer niet-geschikte accommodaties", "Scorebord" → "Bereken ranking"
4. **Activity stats**: verwijder logins/pageviews uit UserCard, behoud alleen "Laatst actief"
5. **Budget in UserCard**: outlier-bescherming toevoegen

---

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/lib/labelMaps.ts` | **Nieuw** — gedeelde label-mappings |
| `src/pages/Wensen.tsx` | Labels voor dieet/activiteiten, budget outlier-filter |
| `src/pages/Uitslag.tsx` | Emoji→iconen, labels voor dieet/activiteiten, lege states |
| `src/pages/Admin.tsx` | AlertDialog eliminatie, leesbare accommodatie-info, selectieronde labels, activity stats cleanup |
| `src/components/VoteOverviewTable.tsx` | Labels voor raw values |

