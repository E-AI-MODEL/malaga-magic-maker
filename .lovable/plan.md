

# Compleet plan: Intake opschonen + Timer/Deadline + Activity Tracking

Dit plan combineert alle openstaande wijzigingen in een enkel, volledig uitvoerbaar geheel.

---

## DEEL 1: Intake pagina opschonen

### Huidige problemen gevonden in de code

1. **Top 3 accommodaties (regels 381-417)**: Staat er nog in, moet verwijderd worden -- accommodaties zijn ter informatie, keuze volgt later
2. **"Gratis annuleerbaar" checkbox (regel 352)**: Staat er nog in, was al besloten te verwijderen
3. **require_pool, require_airco, require_wifi, require_parking, require_terrace**: Database-kolommen bestaan, maar worden NIET meegestuurd in de submit payload (regels 131-145) -- data gaat dus verloren bij opslaan
4. **top_accommodations staat nog in de payload** (regel 141) -- moet eruit
5. **Twee opmerkingenvelden**: remarksA (blok A, regel 284) en remarksB (blok B, regel 376) -- consolideren naar 1 veld
6. **Eetvoorkeuren en Activiteiten** hebben geen sectieletter -- moeten onder "C" vallen
7. **Dilemma-game staat als "C"** -- moet "D" worden in de nieuwe structuur

### Nieuwe intake structuur

```text
HERO: Intake - Jouw voorkeuren

A - Vaste gegevens (bestaand, blijft)
    Vluchten, golf, akkoord checkbox, Edwin rondes-keuze

B - Jouw voorkeuren / Must-haves (bestaand, opgeschoond)
    Vervoer, Locatie, Max reistijd
    Accommodatie wensen (ZONDER "Gratis annuleerbaar")
    Budget cap

C - Over jou (NIEUW label, groepeert bestaande losse secties)
    Eetvoorkeuren
    Activiteiten naast golf
    1x opmerkingenveld (vervangt remarksA + remarksB)

D - Wat vind jij belangrijk? (hernummerd van C naar D)
    Dilemma-game

[Opslaan & locken]
```

### Concrete wijzigingen in `src/pages/Intake.tsx`

- **Verwijder** hele Top 3 accommodaties sectie (regels 381-417)
- **Verwijder** state: `topAccommodations`, `accommodationsList`, en de fetch van accommodations in useEffect
- **Verwijder** `top_accommodations` uit submit payload
- **Verwijder** "Gratis annuleerbaar" checkbox uit de wensenlijst (regel 352)
- **Verwijder** state `requireCancelable` en uit payload
- **Voeg toe** aan submit payload: `require_pool`, `require_airco`, `require_wifi`, `require_parking`, `require_terrace`
- **Voeg toe** in useEffect data-load: deze 5 velden uit bestaande submission laden
- **Verwijder** `remarksA` state en veld uit blok A
- **Verwijder** `remarksB` state en veld uit blok B
- **Voeg toe** 1x `remarks` state + veld in blok C (nieuw)
- **Hernummer** Eetvoorkeuren + Activiteiten secties onder letter "C" met cirkel-label
- **Hernummer** Dilemma-game van "C" naar "D"

### Database migratie

- Kolom `require_cancelable` mag blijven bestaan (geen destructieve migratie nodig)
- Kolommen `require_pool` etc. bestaan al -- geen schema-wijziging nodig
- Kolom `top_accommodations` mag blijven (geen data loss)

---

## DEEL 2: Deadline / Timer systeem

### Database: nieuwe tabel `app_settings`

```sql
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Iedereen kan lezen
CREATE POLICY "Anyone can read settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Alleen admin kan updaten
CREATE POLICY "Admin can update settings"
  ON public.app_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

Seed via insert tool:
```sql
INSERT INTO public.app_settings (key, value)
VALUES ('intake_deadline', '2026-03-03T18:00:00+01:00');
```

### Nieuw bestand: `src/hooks/useDeadline.ts`

- Haalt `intake_deadline` op uit `app_settings`
- Returned: `deadline: Date`, `isPastDeadline: boolean`, `timeRemaining: string` (aftellend)
- Pollt elke 30 seconden voor admin-wijzigingen
- `timeRemaining` formaat: "Xd Xu Xm" of "Verlopen"

### Wijziging: `src/pages/Intake.tsx`

- Importeert `useDeadline`
- Toont countdown-banner bovenaan het formulier (onder hero): rode balk als < 1 uur resterend, oranje als < 6 uur
- Als `isPastDeadline`: hele formulier disabled, overlay met "De stemming is gesloten. Neem contact op met de admin."
- Submit-knop disabled na deadline

### Wijziging: `src/pages/Admin.tsx`

Nieuwe sectie "Deadline beheer":
- Toont huidige deadline datum/tijd
- Knoppen: "+1 uur", "+6 uur", "+1 dag"
- Handmatig datum/tijd invoerveld met opslaan-knop
- Update via `supabase.from("app_settings").update(...)` + logOverride

---

## DEEL 3: Gebruikersgedrag tracking

### Database: nieuwe tabel `activity_log`

```sql
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,  -- 'login', 'page_view', 'click'
  page TEXT NOT NULL,         -- '/intake', '/accommodations'
  detail TEXT,                -- bijv. accommodatie-ID, knopnaam
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Gebruikers kunnen eigen logs inserten
CREATE POLICY "Users can insert own logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admin kan alles lezen
CREATE POLICY "Admin can read all logs"
  ON public.activity_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

### Nieuw bestand: `src/hooks/useActivityLog.ts`

- Custom hook die automatisch page_view logt bij elke route-change (via `useLocation`)
- Exporteert `logEvent(eventType, page, detail?)` voor handmatige events
- Debouncet duplicate page_views (niet loggen als dezelfde pagina binnen 2 sec)
- Wordt gemount in `AppLayout`

### Wijziging: `src/components/AppLayout.tsx`

- Importeert en mount `useActivityLog()` hook

### Wijziging: `src/lib/auth.tsx`

- Na succesvolle `signIn`: log een "login" event via directe Supabase insert

### Wijziging: `src/pages/AccommodationDetail.tsx`

- Log een "click" event met accommodatie-ID als detail bij page load

### Wijziging: `src/pages/Admin.tsx`

Nieuwe sectie "Gebruikersactiviteit":
- Per gebruiker (niet-admin) een uitklapbare kaart met:
  - Laatste activiteit (timestamp)
  - Totaal aantal paginabezoeken
  - Lijst van unieke pagina's bezocht
  - Welke accommodaties bekeken (met namen)
  - Timeline van laatste 20 events

---

## Samenvatting alle bestanden

| Bestand | Actie | Wat |
|---|---|---|
| Migratie SQL | Nieuw | `app_settings` + `activity_log` tabellen + RLS |
| Insert SQL | Data | Seed deadline waarde |
| `src/hooks/useDeadline.ts` | Nieuw | Deadline hook met countdown |
| `src/hooks/useActivityLog.ts` | Nieuw | Activity tracking hook |
| `src/pages/Intake.tsx` | Wijzigen | Opschonen (verwijder top3, annuleerbaar, dubbele remarks) + fix payload + deadline lock + countdown |
| `src/pages/Admin.tsx` | Wijzigen | Deadline beheer + gebruikersactiviteit secties |
| `src/components/AppLayout.tsx` | Wijzigen | Mount activity tracker |
| `src/lib/auth.tsx` | Wijzigen | Login event loggen |
| `src/pages/AccommodationDetail.tsx` | Wijzigen | Accommodatie-view event loggen |

### Volgorde van uitvoering

1. Database migratie (app_settings + activity_log)
2. Seed deadline data
3. useDeadline hook
4. useActivityLog hook
5. Intake.tsx opschonen + deadline integratie
6. AppLayout.tsx + auth.tsx activity logging
7. Admin.tsx uitbreiden met deadline beheer + activiteitsoverzicht
8. AccommodationDetail.tsx activity logging

