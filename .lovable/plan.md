

## Twee issues gevonden

### 1. BottomNav: "Dashboard" label + hamburger-menu icoon
De eerste tab heet "Dashboard" met een `LayoutDashboard` icoon, en de "Meer" knop gebruikt een `Menu` (hamburger) icoon. Dit is verwarrend -- "Dashboard" is geen duidelijke naam voor de taken-pagina, en het hamburger-icoon suggereert een volledig navigatiemenu.

**Fix:**
- Hernoem "Dashboard" naar **"Taken"** (dat is waar `/taken` naartoe gaat)
- Vervang `LayoutDashboard` icoon door `CheckCircle2` of `ClipboardList` (past beter bij taken)
- Vervang het `Menu` (hamburger) icoon door `MoreHorizontal` of `Grid2X2` (drie puntjes / grid -- duidelijker voor "meer opties")

### 2. Accommodaties disclaimer popup verwijderen
De "Ter indicatie" disclaimer popup op de accommodatie-pagina moet volledig weg. Dit betekent:
- Verwijder de `showDisclaimer` state
- Verwijder de `Dialog` component met de disclaimer tekst
- Verwijder de `localStorage` check

**Bestanden:**

| Bestand | Wijziging |
|---|---|
| `src/components/BottomNav.tsx` | Hernoem "Dashboard" → "Taken", vervang iconen |
| `src/pages/Accommodations.tsx` | Verwijder disclaimer Dialog volledig |

