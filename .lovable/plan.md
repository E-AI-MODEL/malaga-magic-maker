
## Diagnose: waarom de intake-pagina wit wordt

Ik heb de codepad doorgelopen en de oorzaak is duidelijk:

- `Intake.tsx` roept direct bij render `const logEvent = useLogEvent();` aan.
- `useLogEvent()` gooit expres een error als er geen `ActivityLogProvider` aanwezig is.
- Die provider staat nu in `AppLayout`.
- Maar `AppLayout` wordt pas **gerenderd in de return** van `Intake`.
- Dus op het moment dat `useLogEvent()` wordt aangeroepen, bestaat de provider nog niet → runtime error → wit scherm.

Dit patroon staat ook in:
- `src/pages/Accommodations.tsx`
- `src/pages/AccommodationDetail.tsx`

Dus het probleem kan ook daar optreden.

## Implementatieplan (fix)

### 1) Provider naar applicatie-root verplaatsen
**Bestand:** `src/App.tsx`

- `ActivityLogProvider` importeren.
- `AppRoutes` wrappen met `ActivityLogProvider` binnen `BrowserRouter` en `AuthProvider`.
- Volgorde moet zijn:  
  `BrowserRouter` → `AuthProvider` → `ActivityLogProvider` → `AppRoutes`  
  (zodat `useActivityLog` zowel `useLocation` als `useAuth` kan gebruiken).

### 2) Dubbele/nest-provider uit layout verwijderen
**Bestand:** `src/components/AppLayout.tsx`

- `ActivityLogProvider` import en wrapper verwijderen.
- Layout puur als layout laten werken.
- Hiermee voorkomen we ook dubbele/onnodige lifecycle-logs.

### 3) Defensieve fallback toevoegen (hardening)
**Bestand:** `src/contexts/ActivityLogContext.tsx`

- `useLogEvent()` niet meer hard laten crashen met `throw`.
- In plaats daarvan veilige no-op fallback teruggeven + `console.warn` in dev.
- Dit voorkomt een volledig wit scherm als provider ooit per ongeluk ontbreekt.

## Waarom dit de juiste fix is

- De echte fout zit in de provider-hiërarchie, niet in intake-data.
- Door provider op root-niveau beschikbaar te maken, werken alle routepagina’s die `useLogEvent()` gebruiken.
- De intake-pagina, accommodaties en detailpagina renderen daarna normaal.

## Validatie na implementatie

1. Inloggen als normale gebruiker.
2. Navigeren naar `/intake` → pagina moet zichtbaar zijn.
3. Navigeren naar `/accommodations` en detailpagina → ook zichtbaar.
4. In admin controleren dat tracking-events nog binnenkomen (`page_view`, `intake_submitted`, etc.).
5. Console checken op afwezigheid van crash rondom `useLogEvent`.

## Risico / impact

- Laag risico.
- Geen databasewijzigingen nodig.
- Alleen frontend context-architectuur.
