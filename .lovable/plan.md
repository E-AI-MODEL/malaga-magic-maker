# Plan: Uitgebreide gebruikerstracking en admin-overzicht op alle pagina's

## Samenvatting

Twee verbeteringen: (1) veel meer gebruikersgedrag tracken en weergeven in het admin dashboard, en (2) en voor alleen de admin ten allen tijde blijft intake pag open staan en kan de admin gegevens locken unlocken.

## 1. Extra tracking events toevoegen

### Wat er nu wordt gelogd

- `page_view` (automatisch bij route-wissel)
- `login` (bij inloggen)
- `click` met detail (momenteel nergens actief gebruikt in pagina's)

### Nieuwe events die worden gelogd


| Event                       | Pagina              | Detail                                                  |
| --------------------------- | ------------------- | ------------------------------------------------------- |
| `intake_started`            | /intake             | Wanneer gebruiker begint met invullen                   |
| `intake_submitted`          | /intake             | Wanneer intake wordt verzonden en gelocked              |
| `intake_section_view`       | /intake             | Welke sectie bekeken wordt (A, B, C, D, E)              |
| `accommodation_view`        | /accommodations/:id | Welke accommodatie bekeken wordt (ID)                   |
| `accommodation_list_filter` | /accommodations     | Filter/sorteer actie (welk filter)                      |
| `external_link_click`       | Diverse             | URL van externe link (Lounge tip Pieter, Eddy de Caddy) |
| `dilemma_answer`            | /intake             | Dilemma keuze                                           |
| `session_duration`          | Alle                | Tijd op pagina (bij verlaten pagina)                    |


### Bestanden die aangepast worden

- `**src/pages/Intake.tsx**` -- `logEvent` calls toevoegen bij intake start, submit, sectie-wisselingen
- `**src/pages/AccommodationDetail.tsx**` -- `logEvent` bij openen detail
- `**src/pages/Accommodations.tsx**` -- `logEvent` bij filter/sorteer
- `**src/hooks/useActivityLog.ts**` -- Sessieduur tracking toevoegen (log tijd op pagina bij route-wissel)
- `**src/components/AppLayout.tsx**` -- `logEvent` beschikbaar maken via context of prop drilling vervangen

### Aanpak voor logEvent beschikbaarheid

Momenteel wordt `useActivityLog()` alleen in `AppLayout` aangeroepen maar `logEvent` wordt niet doorgegeven aan child-pagina's. Oplossing: een React Context maken (`ActivityLogContext`) zodat elke pagina `logEvent` kan aanroepen zonder prop drilling.

## 2. Uitgebreid admin dashboard -- Gedrag sectie

### Huidige weergave per gebruiker

- 3 stats: Logins, Pageviews, Acc. bekeken
- Max 15 log entries

### Nieuwe weergave per gebruiker

- **Sessie-overzicht**: eerste en laatste activiteit, totale sessieduur (geschat), aantal unieke sessies
- **Pagina breakdown**: tabel met per pagina het aantal bezoeken en gemiddelde tijd
- **Intake voortgang**: of ze gestart zijn, hoeveel secties ze hebben gezien, of ze submitted hebben
- **Accommodatie interactie**: welke accommodaties bekeken, hoeveel keer, wanneer laatst
- **Tijdlijn**: scrollbare lijst van ALLE events (niet max 15), met paginering of "laad meer"
- **Online status indicator**: groene stip als laatste activiteit < 5 min geleden

### Nieuwe groeps-statistieken

- **Engagement overzicht**: wie is het meest/minst actief
- **Populairste accommodaties**: welke het vaakst bekeken worden
- **Intake completion rate**: visueel wie klaar is vs. bezig vs. niet gestart

## 3. Admin zwevende knop op alle pagina's

Een zwevende actie-knop (FAB) rechtsonder (boven de bottom nav) die alleen voor admins zichtbaar is:

- Icoon: Shield of Eye
- Bij klik: opent een mini-overlay/drawer met:
  - Snellink naar /admin dashboard
  - Wie is er nu online (groene stippen)
  - Snelle stats: X/6 intake compleet, laatste activiteit

### Bestanden

- `**src/components/AdminFab.tsx**` -- Nieuw component voor de zwevende knop met mini-overlay
- `**src/components/AppLayout.tsx**` -- AdminFab toevoegen

## Technische details

### Database

Geen schema-wijzigingen nodig. De bestaande `activity_log` tabel (user_id, event_type, page, detail) is voldoende voor alle nieuwe events.

De `limit(500)` in de admin fetch wordt verhoogd naar `limit(2000)` om meer historie te tonen.

### Nieuwe bestanden

1. `**src/contexts/ActivityLogContext.tsx**` -- Context provider voor logEvent, wraps rond AppLayout
2. `**src/components/AdminFab.tsx**` -- Floating action button voor admins

### Aangepaste bestanden

1. `**src/hooks/useActivityLog.ts**` -- Sessieduur tracking, export via context
2. `**src/components/AppLayout.tsx**` -- ActivityLogContext provider, AdminFab toevoegen
3. `**src/pages/Admin.tsx**` -- Uitgebreide gedrag-sectie, online status, engagement stats, meer logs
4. `**src/pages/Intake.tsx**` -- logEvent calls voor intake_started, intake_submitted, section views
5. `**src/pages/AccommodationDetail.tsx**` -- logEvent bij page load
6. `**src/pages/Accommodations.tsx**` -- logEvent bij filter/sort acties