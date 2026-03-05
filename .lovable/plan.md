

## Plan: Mobiel scroll-fix, dashboard = taken, en uitklapmenu's

### Problemen
1. **Onrustig scrollen op mobiel** — de pagina's gebruiken `-mx-4 -mt-6` offsets en de `pb-20` voor bottom nav kan conflicteren met scroll-gedrag. Geen `overflow` sturing op de main container.
2. **Dashboard trackt niet** — er is geen "Dashboard" pagina; de BottomNav heeft "Taken" maar de user bedoelt dat dit de dashboard-functie moet vervullen.
3. **Uitklapmenu's op dashboard** — de Taken-pagina toont alle secties als losse Collapsible cards, maar er is geen overkoepelend accordion/uitklapmenu-structuur die de pagina overzichtelijk maakt.

### Oplossing

**1. Mobiel scroll-fix (`AppLayout.tsx` + `index.css`)**
- Voeg `overflow-x-hidden` toe aan de outer container om horizontale scroll te voorkomen door de negatieve margins
- Voeg `-webkit-overflow-scrolling: touch` en `scroll-behavior: smooth` toe aan CSS voor vloeiender mobiel scrollen
- Verwijder de `-mx-4 -mt-6` hack in Taken.tsx en TaskContext.tsx; pas in plaats daarvan de AppLayout `main` padding aan met een prop of maak de header full-bleed via negatieve margins alleen op het header-element

**2. Dashboard = Taken (BottomNav.tsx)**
- Hernoem "Taken" naar "Dashboard" in de BottomNav zodat het duidelijk is dat dit de hoofdpagina is
- Verander het icoon naar `LayoutDashboard` of houd `ListChecks`
- Route blijft `/taken`

**3. Uitklapmenu's op de Taken/Dashboard-pagina (`Taken.tsx`)**
- Groepeer de content in een `Accordion` met secties:
  - **Vluchtgegevens** (bestaande collapsible → accordion item)
  - **Taken** per sectie (transport, accommodatie, golf, strand) als accordion items
- Gebruik `Accordion type="multiple"` zodat meerdere secties open kunnen staan
- Elke taak-card wordt een AccordionItem met de bestaande content erin
- Dit vervangt de huidige losse `Collapsible` per taak

### Bestanden
- **Wijzig**: `src/components/AppLayout.tsx` — overflow-x-hidden, scroll smoothing
- **Wijzig**: `src/index.css` — webkit smooth scroll
- **Wijzig**: `src/components/BottomNav.tsx` — label "Dashboard"
- **Wijzig**: `src/pages/Taken.tsx` — Accordion wrapper, verwijder scroll-problematische offsets
- **Wijzig**: `src/pages/TaskContext.tsx` — zelfde offset-fix

