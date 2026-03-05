

## Plan

### 1. Verwijder AdminFab
- **`src/components/AppLayout.tsx`**: Verwijder de `<AdminFab />` component en de import. De admin-knop in de BottomNav is voldoende.
- **`src/components/AdminFab.tsx`**: Kan verwijderd worden (of laten staan, wordt niet meer gerenderd).

### 2. Analyse: verbetermogelijkheden

Na het doornemen van de hele codebase, dit zijn de meest waardevolle verbeteringen:

**A. Info-pagina heeft nog `-mx-4 -mt-6` scroll-hack**
De scroll-fix is toegepast op Taken en TaskContext, maar `Info.tsx` (regel 16) en `Accommodations.tsx` (regel 78) en `Uitslag.tsx` (regel 158) gebruiken nog `-mx-4 -mt-6`. Dit veroorzaakt het onrustige scrollen op die pagina's. Deze moeten ook gefixed worden.

**B. Notificaties verbeteren**
Er is een basale notificatie-check bij het openen van Taken, maar er is geen notificatie-badge op de BottomNav. Gebruikers zien niet dat er nieuwe reacties/comments zijn zonder de pagina te openen.

**C. Taak drag-and-drop volgorde**
Taken kunnen nu alleen toegevoegd/verwijderd worden, maar de volgorde (`sort_order`) kan niet aangepast worden door de admin.

**D. Dashboard: totaaloverzicht ontbreekt**
Het dashboard toont alleen taken per sectie, maar mist een samenvatting bovenaan (bijv. totale voortgang, aantal open taken, aankomende deadlines).

**E. Accommodations pagina heeft nog de disclaimer-modal**
Elke keer dat je de pagina opent verschijnt een "Ter indicatie" modal. Dit zou beter een eenmalige dismiss zijn (opslaan in localStorage).

**F. Uitslag pagina: nog steeds `-mx-4 -mt-6`**
Zelfde scroll-probleem als Info.

### Voorstel prioriteit

| # | Verbetering | Impact |
|---|---|---|
| 1 | AdminFab verwijderen | Klein, direct |
| 2 | Scroll-fix op Info, Accommodations, Uitslag | UX fix |
| 3 | Dashboard totaaloverzicht toevoegen | Overzicht |
| 4 | Notificatie-badge op BottomNav | Engagement |
| 5 | Disclaimer modal eenmalig tonen | UX polish |

### Bestanden te wijzigen
- `src/components/AppLayout.tsx` — verwijder AdminFab
- `src/pages/Info.tsx` — verwijder `-mx-4 -mt-6`
- `src/pages/Accommodations.tsx` — verwijder `-mx-4 -mt-6`
- `src/pages/Uitslag.tsx` — verwijder `-mx-4 -mt-6`
- `src/pages/Intake.tsx` — verwijder `-mx-4 -mt-6`
- Optioneel: `src/components/BottomNav.tsx` — notificatie-badge
- Optioneel: `src/pages/Taken.tsx` — dashboard samenvatting

