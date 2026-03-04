

## Plan: Takenverdeling + Reacties & Stemmen

### 1. Database migratie

**Nieuwe tabel `tasks`:**
- `id` uuid PK
- `title` text (bijv. "Autohuur regelen")
- `section` text (identifier)
- `assigned_to` text nullable (admin vult naam in)
- `status` text default 'open'
- `sort_order` int
- `created_at` timestamptz

RLS: iedereen kan lezen, admin kan insert/update/delete.

**Nieuwe tabel `task_votes`:**
- `id` uuid PK
- `task_id` uuid FK → tasks
- `user_id` uuid
- `voted_for_user_id` uuid (op wie je stemt)
- `created_at` timestamptz
- Unique constraint op `(task_id, user_id)` — 1 stem per taak per gebruiker

RLS: authenticated kan lezen en eigen insert/update, admin kan alles.

**Nieuwe tabel `reactions`:**
- `id` uuid PK
- `user_id` uuid
- `section` text
- `emoji` text
- `created_at` timestamptz
- Unique constraint op `(user_id, section, emoji)`

RLS: authenticated kan lezen, eigen insert/delete.

**Nieuwe tabel `comments`:**
- `id` uuid PK
- `user_id` uuid
- `section` text
- `message` text
- `created_at` timestamptz

RLS: authenticated kan lezen, eigen insert/delete.

Realtime enabled op alle 4 tabellen.

Seed de 4 taken: "Autohuur of taxi regelen", "Accommodatie boeken", "Flights boeken", "Lounge tent aan het strand reserveren".

### 2. Takenverdeling bovenaan Uitslag pagina

Nieuw component `TaskBoard` bovenaan de pagina, vóór de header:
- Kaartjes per taak met titel en status
- Per taak: dropdown/knoppen om te stemmen op een groepslid (uit profiles)
- Toont stemverdeling (wie heeft hoeveel stemmen)
- Admin ziet een extra veld om een naam/persoon definitief toe te wijzen
- Wanneer `assigned_to` is ingevuld, toont de kaart een "Toegewezen aan: Naam" badge

### 3. ReactionBar component

Compact component met 4 emoji-knoppen (👍 🔥 ❤️ 😂):
- Toggle eigen reactie on/off
- Toont count per emoji
- Wordt geplaatst onder elke ResultSection en de Villa Mercedes sectie

### 4. SectionComments component

Uitklapbaar (Collapsible) commentaarveld per sectie:
- Toont comments met gebruikersnaam + relatief tijdstip
- Tekstveld + verzendknop
- Eigen comments verwijderbaar

### 5. Integratie in Uitslag.tsx

- `TaskBoard` helemaal bovenaan (vóór "Gezamenlijke uitslag" header)
- `ReactionBar` + `SectionComments` onder elke sectie (villa, vervoer, accommodatie, prioriteiten, eten, activiteiten)
- Realtime subscriptions voor live updates
- Activity logging voor reacties, comments en stemmen

### Technische details

- Alle data wordt opgehaald in Uitslag.tsx via een enkele useEffect, gegroepeerd client-side
- Admin-check via `useAuth` + `has_role` voor het toewijzingsveld
- Profielen zijn al beschikbaar in state voor naamweergave

