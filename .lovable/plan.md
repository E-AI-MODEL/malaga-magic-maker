## Plan: Navigatie-refactor, kosten bij taken, en pagina-organisatie

### Analyse huidige situatie

**BottomNav**: 5 items (6 voor admin). Toevoegen van "Kosten" maakt het te druk. Oplossing: **"Meer" tab** die een sheet opent met secundaire pagina's.

**Admin (794 regels)**: Alles op één lange pagina met losse `Collapsible` secties. Geen structuur, moeilijk scanbaar.

**Uitslag (575 regels)**: Genummerde `ResultSection`'s maar niet inklapbaar. Lange scroll zonder overzicht.

**Taken**: Al goed met Accordion. Mist prijs- en betalingsinformatie.

---

### Oplossing

#### 1. BottomNav → 4 tabs + "Meer" sheet

Houd 4 primaire tabs: **Dashboard**, **Info**, **Uitslag**, **Meer** (met `Menu` icoon).

"Meer" opent een `Sheet` (bottom drawer) met links naar:

- Verblijven
- Kosten (nieuw)
- Intake
- Admin (alleen voor admin)

Elke link krijgt een icoon en korte beschrijving. Professionele styling, past bij het editorial design.

#### 2. Admin-pagina → Accordion-structuur

Wrap alle secties in `Accordion type="multiple"`:

- **Deadline beheer**
- **Gebruikers & Intake**
- **Groepsresultaten**
- **Selectieronde**
- **Accommodaties**
- **Override log**

Elke sectie wordt een `AccordionItem` met het bestaande icoon in de trigger. Pagina wordt direct scanbaar.

#### 3. Uitslag-pagina → Accordion-structuur

Wrap de genummerde secties (Vervoer, Accommodatie, Prioriteiten, Eten, Activiteiten) in `Accordion type="multiple"`. Topkandidaat blijft altijd zichtbaar bovenaan (buiten accordion). Elke sectie toont een mini-samenvatting in de trigger.

#### 4. Kosten toevoegen aan taken

**Database**: Voeg kolommen toe aan `tasks` tabel:

- `cost` (numeric, nullable) — de prijs/kosten
- `paid_by` (text, nullable) — wie heeft betaald

**UI in Taken.tsx**: Naast de deelnemers (eigenaar/backup) toon prijs en betaler:

- Read-only: `€120 · Betaald door Robin`
- In edit-mode: Input voor bedrag + Select voor betaler

#### 5. Nieuwe "Kosten" pagina (`/kosten`)

Overzichtspagina die alle taken met kosten aggregeert:

- Totaal uitgegeven
- Per persoon: hoeveel betaald vs. eerlijk deel
- Wie moet wie nog betalen (settlement)
- Lijst van alle uitgaven per taak

Query't de `tasks` tabel op `cost IS NOT NULL`. Geen extra tabel nodig.

Route toevoegen in `App.tsx`, bereikbaar via het "Meer" menu.

#### 6. Hero-illustraties per pagina

Elke pagina in het "Meer" menu krijgt een compacte hero-header (zoals Taken en Uitslag al hebben) met de bestaande `bg-foreground` stijl + beschrijvend label. De Kosten-pagina krijgt een `Wallet`/`Receipt` icoon header in dezelfde editorial stijl. En bijpassende achtergrond illustratie in stijl kleur en toon  van andere illustraties. 

Daar waar functioneel en mogelijk wordt glassmorfing gebruikt voor extra prof look 

---

### Bestanden


| Bestand                        | Wijziging                                                            |
| ------------------------------ | -------------------------------------------------------------------- |
| `src/components/BottomNav.tsx` | 4 tabs + Sheet met "Meer" menu                                       |
| `src/pages/Admin.tsx`          | Collapsible → Accordion                                              |
| `src/pages/Uitslag.tsx`        | ResultSection → AccordionItems                                       |
| `src/pages/Taken.tsx`          | Kosten + betaler velden in task cards                                |
| `src/pages/Kosten.tsx`         | **Nieuw** — kostenoverzicht & settlements                            |
| `src/App.tsx`                  | Route `/kosten` toevoegen                                            |
| **Database migratie**          | `ALTER TABLE tasks ADD COLUMN cost numeric, ADD COLUMN paid_by text` |
