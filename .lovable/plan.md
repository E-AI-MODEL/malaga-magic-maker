## Plan: Gestructureerde taakinvoer, foto-lightbox en uitklapbare vluchtgegevens

### 1. Database migratie

Voeg een `info_details` jsonb-kolom toe aan `tasks` (naast bestaand `info_text`):

- Slaat gestructureerde velden op: `url`, `activity_date`, `activity_time`, `location`
- Flexibel per taaktype (golfbaan URL vs. accommodatie-link vs. vluchtnummer)
- `info_text` blijft bestaan als vrij notitieveld

### 2. Gestructureerde invoervelden (eigenaar/backup)

Vervang het enkele "Status update" textarea door meerdere compacte velden:

- **Link/URL** (input met globe-icoon) — bijv. link naar golfbaan, Airbnb
- **Datum** (date input) — dag van de activiteit
- **Tijd** (text input) — tijdstip
- **Locatie** (text input) — naam locatie
- **Notities** (textarea, kleiner) — vrije tekst

Niet-bewerkbare gebruikers zien dit als een overzichtelijk kaartje met labels en waarden (geen lege velden tonen).

### 3. Foto lightbox

- Klik op miniatuurfoto opent een fullscreen overlay (Dialog) met de grote versie
- Sluiten met X-knop of klik buiten het beeld
- Miniaturen blijven in het 2-koloms grid

### 4. Vluchtgegevens uitklapbaar

- Wrap de vluchtgegevens-sectie in een Collapsible component
- Header toont "Vluchtgegevens" met chevron, standaard ingeklapt
- Zelfde stijl als de taakkaarten

### 5. Bestanden die wijzigen

- **Database**: migratie voor `info_details jsonb default '{}'` op `tasks`
- `**src/pages/Taken.tsx**`: 
  - Gestructureerde invoervelden i.p.v. enkele textarea
  - Overzichtelijke read-only weergave van details
  - Foto-klik lightbox (Dialog)
  - Vluchtgegevens in Collapsible
- Geen nieuwe componenten nodig, alles past in Taken.tsx

Verplaats de sectie taken in de footer op de plek waar nu uitslag staat en uitslag op de plek waar nu taken staat. 