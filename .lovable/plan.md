# Vakansie — Migratieplan v2.0

## Visie
Van een single-trip Malaga-planner naar **Vakansie**: een professioneel multi-trip platform waar elke admin zijn eigen vakantie plant met deelnemers.

---

## Fase 1: Database — Multi-trip workspace model

### 1.1 Nieuwe tabel: `trips` (vervangt huidige `trip`)
De huidige `trip` tabel wordt hernoemd/gemigreerd naar `trips` met extra kolommen:

```sql
-- trips tabel (vervangt trip)
ALTER TABLE trip ADD COLUMN name text NOT NULL DEFAULT 'Malaga 2026';
ALTER TABLE trip ADD COLUMN description text;
ALTER TABLE trip ADD COLUMN created_by uuid REFERENCES auth.users(id);
ALTER TABLE trip ADD COLUMN cover_image_url text;
ALTER TABLE trip ADD COLUMN status text NOT NULL DEFAULT 'planning'; -- planning, active, completed, archived
ALTER TABLE trip ADD COLUMN invite_code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');
```

### 1.2 Nieuwe tabel: `trip_members`
Koppelt gebruikers aan trips met rollen per trip.

```sql
CREATE TABLE trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member', -- 'organizer' (admin van trip), 'member'
  joined_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, user_id)
);
```

### 1.3 Foreign keys toevoegen aan bestaande tabellen
Alle trip-gebonden tabellen krijgen een `trip_id`:

- `tasks` → `ADD COLUMN trip_id uuid REFERENCES trips(id)`
- `submissions` → `ADD COLUMN trip_id uuid REFERENCES trips(id)`
- `comments` → `ADD COLUMN trip_id uuid REFERENCES trips(id)`
- `reactions` → `ADD COLUMN trip_id uuid REFERENCES trips(id)`
- `task_votes` → al gekoppeld via task_id
- `travel_legs` → `ADD COLUMN trip_id uuid REFERENCES trips(id)`
- `expenses` → `ADD COLUMN trip_id uuid REFERENCES trips(id)`
- `notifications` → `ADD COLUMN trip_id uuid REFERENCES trips(id)`

### 1.4 Datamigratie
Alle bestaande data wordt gekoppeld aan de huidige trip (Malaga 2026) als eerste workspace:

```sql
-- Vul trip_id in voor alle bestaande records
UPDATE tasks SET trip_id = (SELECT id FROM trips LIMIT 1);
UPDATE submissions SET trip_id = (SELECT id FROM trips LIMIT 1);
-- etc.
```

### 1.5 RLS-aanpassingen
Alle policies worden uitgebreid met trip_id check: gebruikers zien alleen data van trips waar ze lid van zijn.

```sql
-- Voorbeeld: tasks SELECT
CREATE POLICY "Members can read trip tasks" ON tasks
FOR SELECT USING (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = tasks.trip_id AND user_id = auth.uid())
);

-- Organizer = trip-admin, kan taken beheren
CREATE POLICY "Organizer can manage tasks" ON tasks
FOR ALL USING (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = tasks.trip_id AND user_id = auth.uid() AND role = 'organizer')
);
```

---

## Fase 2: Authenticatie & Registratie

### 2.1 Registratie-flow (nieuw)
- Registratie met e-mail + wachtwoord (auto-confirm AAN voor snelheid)
- Na registratie → onboarding wizard
- Bestaande hardcoded accounts (Robin, Mark, etc.) blijven werken

### 2.2 Auth refactor
- Verwijder hardcoded `USERNAME_EMAIL_MAP` uit `auth.tsx`
- Ondersteun zowel username als e-mail login
- Voeg "Wachtwoord vergeten" toe

---

## Fase 3: Trip Context & Navigatie

### 3.1 TripProvider (nieuw)
Centrale context die de actieve trip beheert:

```tsx
// src/contexts/TripContext.tsx
interface TripContextType {
  activeTrip: Trip | null;
  userTrips: Trip[];
  switchTrip: (tripId: string) => void;
  createTrip: (data: CreateTripInput) => Promise<Trip>;
  isOrganizer: boolean; // organizer van actieve trip
}
```

### 3.2 Trip-selector
- In de header/nav: dropdown om tussen trips te wisselen
- Alle pagina's filteren automatisch op `activeTrip.id`

### 3.3 URL-structuur
Optie A (simpel, aanbevolen): Trip-id in context, niet in URL. Huidige routes blijven intact.
Optie B (expliciet): `/t/:tripId/taken`, `/t/:tripId/info` etc.

**Keuze: Optie A** — minder breaking changes.

---

## Fase 4: Onboarding Flow

### 4.1 Nieuwe gebruiker (geen trips)
1. Welkomstscherm met uitleg
2. Keuze: "Maak een vakantie" of "Voer uitnodigingscode in"
3. Trip aanmaken: naam, datums, beschrijving, cover-foto
4. Deelnemers uitnodigen via code of e-mail

### 4.2 Trip aanmaken wizard
Stap 1: Basisinfo (naam, locatie, datums, groepsgrootte)
Stap 2: Secties kiezen (welke categorieën: vervoer, verblijf, golf, activiteiten, eten)
Stap 3: Deelnemers uitnodigen (genereer link/code)
Stap 4: Eerste taken aanmaken (templates per sectie)

### 4.3 Uitnodiging accepteren
- Via unieke link: `/join/:inviteCode`
- Niet-ingelogd → registratie → automatisch lid
- Wel ingelogd → direct lid

---

## Fase 5: Dashboard Redesign

### 5.1 Trip Home (vervangt huidige /taken)
- Hero-banner met trip cover image, naam, countdown
- Quick stats: aantal taken, voortgang, openstaande items
- Activiteitenfeed (laatste 5 acties)
- Snelkoppelingen naar secties

### 5.2 Verbeterde taakkaarten
- Rijkere visuele hiërarchie met subtiele animaties (framer-motion)
- Avatar-chips voor toegewezen personen
- Inline voortgangsindicator met kleurverloop
- Deadline-indicator met urgentie-kleuring

### 5.3 Statistieken-widget
- Cirkeldiagram: taken per status
- Voortgangsbalk per sectie
- Budget-overzicht compact

### 5.4 Tijdlijn-weergave (optioneel)
- Horizontale tijdlijn van de trip
- Taken geplot op datums
- Drag & drop voor herschikking

---

## Fase 6: Notificaties & Activiteit

### 6.1 Notificatiecentrum
- Bell-icon in header met badge count
- Dropdown/drawer met notificatielijst
- Categorieën: taken, comments, stemmen, uitnodigingen
- Mark as read, mark all as read

### 6.2 Activiteitenfeed
- Per-trip feed op het dashboard
- "Robin heeft de voortgang van 'Vluchten boeken' bijgewerkt naar 75%"
- Real-time via Supabase Realtime

### 6.3 Real-time indicators
- Online-status van tripleden (groene stip)
- "Bezig met typen..." in comments
- Live voortgangsupdates op kaarten

---

## Fase 7: Branding & Theming

### 7.1 App-branding
- Nieuwe naam: **Vakansie**
- Logo ontwerp (palm + koffer icoon)
- Favicon update
- Meta tags & OG images

### 7.2 Kleurthema per trip
- Elke trip kan een accent-kleur kiezen
- CSS custom properties worden dynamisch gezet
- Preset paletten: Tropical, Mountain, City, Beach, Winter

### 7.3 Dark mode
- Volledige dark mode ondersteuning (al deels aanwezig)
- Toggle in profiel/instellingen
- System-preference detectie

### 7.4 Typografie & spacing upgrade
- Grotere touch targets (min 44px)
- Betere visuele hiërarchie door meer contrast in font-sizes
- Micro-animaties met framer-motion

---

## Fase 8: Profielpagina & Instellingen

### 8.1 Profielpagina
- Avatar upload
- Display name bewerken
- Overzicht van trips
- Notificatie-voorkeuren

### 8.2 Trip-instellingen (voor organizer)
- Trip bewerken (naam, datums, cover)
- Leden beheren (rollen, verwijderen)
- Secties configureren
- Trip archiveren/verwijderen

---

## Implementatievolgorde

| Stap | Fase | Geschatte berichten | Prioriteit |
|------|------|---------------------|-----------|
| 1 | DB: trips + trip_members tabellen | 2-3 | 🔴 Kritiek |
| 2 | DB: trip_id toevoegen + migratie | 2-3 | 🔴 Kritiek |
| 3 | TripProvider + trip-selector | 2 | 🔴 Kritiek |
| 4 | RLS policies updaten | 2 | 🔴 Kritiek |
| 5 | Alle queries filteren op trip_id | 3-4 | 🔴 Kritiek |
| 6 | Registratie-flow | 2 | 🟡 Hoog |
| 7 | Onboarding wizard | 3-4 | 🟡 Hoog |
| 8 | Uitnodigingssysteem | 2 | 🟡 Hoog |
| 9 | Dashboard redesign | 3-4 | 🟡 Hoog |
| 10 | Notificatiecentrum | 2 | 🟢 Medium |
| 11 | Activiteitenfeed | 2 | 🟢 Medium |
| 12 | Branding (Vakansie) | 1-2 | 🟢 Medium |
| 13 | Kleurthema per trip | 2 | 🔵 Nice-to-have |
| 14 | Profielpagina | 2 | 🔵 Nice-to-have |
| 15 | Tijdlijn-weergave | 3 | 🔵 Nice-to-have |

---

## Technische richtlijnen

- **Geen breaking changes**: Alle migraties zijn backwards-compatible
- **Feature flags**: Nieuwe features achter flags tot ze klaar zijn
- **Component-extractie**: Taken.tsx (934 regels!) moet opgesplitst in kleinere componenten
- **Type safety**: Alle nieuwe tabellen direct als TypeScript types
- **Performance**: React Query voor caching, lazy loading voor zware pagina's
- **Framer Motion**: Installeren voor professionele animaties

---

## Status

- [x] Plan opgesteld
- [x] Fase 1: Database multi-trip model ✅ (trips extended, trip_members created, trip_id on all tables, data migrated)
- [x] Fase 2: Auth & registratie ✅ (signUp added, email+username login, Login page updated to VAKANSIE)
- [x] Fase 3: Trip context & navigatie ✅ (TripProvider created, switchTrip, createTrip, joinTrip)
- [x] Fase 4: Onboarding ✅ (Onboarding page, JoinTrip page, trip selector in header, TripGuard)
- [x] Fase 5: Dashboard redesign ✅ (Trip hero with countdown/stats/invite code, branding to Vakansie)
- [ ] Fase 6: Notificaties
- [ ] Fase 7: Branding
- [ ] Fase 8: Profiel & instellingen
