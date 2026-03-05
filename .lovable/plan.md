

## Plan: Taak-contextpagina's in plaats van externe links

### Probleem
De huidige `TASK_LINKS` met `ExternalLink`-icoon suggereren een externe doorverwijzing. In plaats daarvan moet elke taak een interne contextpagina krijgen die de eigenaar helpt met een overzicht van alle relevante info.

### Oplossing

**Nieuwe route `/taken/:section`** (bijv. `/taken/transport`, `/taken/accommodatie`, `/taken/golf`, `/taken/strand`) die per sectie een contextueel overzicht toont.

**Nieuwe pagina `src/pages/TaskContext.tsx`:**
- Haalt alle relevante data op per sectie:
  - **Gebruikerswensen**: uit `submissions` (voorkeuren, budget, must-haves)
  - **Verzamelde info**: uit de `tasks` tabel (info_details, info_text, foto's)
  - **Externe links**: gestructureerd weergegeven (geen losse ExternalLink-iconen)
  - **Accommodaties** (voor sectie `accommodatie`): top-ranked opties
  - **Info-pagina content**: reistijden, voor/tegens per locatie-optie
- Sectie-specifieke blokken:
  - `transport`: vervoersopties (busje vs taxi), reistijden, links
  - `accommodatie`: groepsregels, top accommodaties, links naar detail
  - `golf`: golfbanen, reistijden, tee-times, kaart-info
  - `strand`: strandtent-opties, locatie-info

**Layout per contextpagina:**
1. **Header** met sectie-titel en taakeigenaar
2. **Groepswensen** — samenvatting van relevante submissions-data
3. **Verzamelde details** — wat de eigenaar al heeft ingevuld (datum, tijd, locatie, notities)
4. **Foto's** — galerij van geüploade foto's met lightbox
5. **Externe bronnen** — nette lijst van links met label + domein
6. **Reacties** — comments van de groep over dit onderwerp

**Wijzigingen in Taken.tsx:**
- Vervang `TASK_LINKS` met interne navigatie naar `/taken/{section}`
- Verwijder `ExternalLink`-icoon, gebruik `ChevronRight` of `ArrowRight`
- Link-tekst wordt "Bekijk context & info" i.p.v. "Golfinfo"

**Wijzigingen in App.tsx:**
- Voeg route `/taken/:section` toe met `TaskContext` component

### Bestanden
- **Nieuw**: `src/pages/TaskContext.tsx`
- **Wijzig**: `src/pages/Taken.tsx` (link aanpassen)
- **Wijzig**: `src/App.tsx` (route toevoegen)
- Geen database-wijzigingen nodig

