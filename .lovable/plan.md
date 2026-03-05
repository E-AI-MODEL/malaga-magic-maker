

## Plan: Takenpagina + Uitslag opschonen

### Samenvatting
De taken worden verplaatst naar een eigen pagina `/taken` met uitgebreide functionaliteit: backup-toewijzing, voortgangsbarometer, foto-uploads en vluchtgegevens. De Uitslagpagina wordt opgeschoond (TaskBoard verwijderd). Stemmen op taken wordt afgesloten nu taken zijn toegewezen.

---

### 1. Database migratie

**Wijzigingen aan `tasks` tabel:**
- `backup_to` text nullable — tweede persoon als backup
- `voting_closed` boolean default true — stemmen sluiten
- `progress` integer default 0 — barometer 0-100
- `info_text` text nullable — status-update tekst van eigenaar/backup
- `info_image_urls` text[] default '{}' — geüploade foto's

**Nieuwe tabel `travel_legs`** (vluchtgegevens):
- `id` uuid PK
- `passengers` text[] — namen
- `departure_time` text — "7:50"
- `arrival_time` text — "10:45"
- `travel_date` date
- `note` text nullable — "vertrek en bestemming onbekend"
- `sort_order` int
- `created_at` timestamptz

RLS: iedereen kan lezen, admin kan CRUD.

Seed travel_legs met de 3 vluchtgroepen.

**Storage bucket** `task-attachments` voor foto-uploads.

Realtime op `travel_legs`.

---

### 2. Nieuwe pagina `/taken` (src/pages/Taken.tsx)

Layout in blokken, consistent met de rest van de site:

**Blok 1 — Vluchtgegevens**
- Compact overzicht van de 3 reisgroepen (accordion of cards)
- Admin kan gegevens inline bewerken (tijden, passagiers, notities)

**Blok 2 — Takenkaarten** (4 taken)
Per taak een uitklapbare card:
- **Header**: titel + eigenaar badge + backup badge
- **Ingeklapt**: compacte voortgangsbalk (0-100%)
- **Uitgeklapt**:
  - Slider/barometer (0-100) — alleen eigenaar, backup & admin kunnen schuiven
  - Tekstveld voor status-update + foto-upload — alleen eigenaar, backup & admin
  - Minimalistische hyperlink naar gerelateerde info (bijv. "/accommodations" voor "Accommodatie boeken", Airbnb-link, etc.)
  - Reacties (ReactionBar) + Commentaren (SectionComments) — alle gebruikers
  - Admin: dropdown om eigenaar/backup te wijzigen

**Stijl**: editorial blokken, accordions, zelfde typografie en kleuren als de rest.

---

### 3. Uitslag opschonen (src/pages/Uitslag.tsx)

- Verwijder `<TaskBoard>` component-import en rendering (regel 9, 161)
- Verwijder comments/onAddComment/onDeleteComment props die alleen voor TaskBoard waren (die worden nog gebruikt door secties zelf, dus die blijven)
- Eventueel een subtiele link toevoegen naar `/taken`: "Bekijk de takenverdeling →"

---

### 4. Routing & navigatie

- Nieuwe route `/taken` in App.tsx (ProtectedRoute)
- Toevoegen aan BottomNav met ClipboardList icon + "Taken" label

---

### 5. Technische details

- Eigenaar/backup check: vergelijk `task.assigned_to` en `task.backup_to` met `profile.display_name` van huidige user
- Foto-upload: Supabase Storage bucket `task-attachments`, public URLs opslaan in `info_image_urls`
- Progress slider: Radix Slider component (al geïnstalleerd)
- Hyperlinks per taak: hardcoded mapping van task section → relevante URL
- Admin kan alle velden bewerken via inline Select/Input componenten

