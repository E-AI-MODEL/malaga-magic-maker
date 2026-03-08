

# Oplossing: Accommodatie-data verzamelen zonder webcrawl

## Het probleem
Booking.com en Airbnb hebben agressieve anti-scraping maatregelen. Zelfs Firecrawl kan vaak geblokkeerd worden of incomplete data teruggeven. De huidige accommodaties zijn handmatig in de database gezet.

## Opties

### Optie A: Firecrawl-connector inzetten (gedeeltelijke oplossing)
Firecrawl kan sommige pagina's wel scrapen (vooral kleinere platforms zoals HomeToGo, Agoda). Voor Booking/Airbnb is het hit-or-miss. Dit kan als aanvulling dienen maar niet als primaire bron.

### Optie B: Slimme admin-invoer met URL-parsing (aanbevolen)
Een gestroomlijnd admin-formulier waarmee je:
1. Een listing-URL plakt (Booking, Airbnb, HomeToGo, etc.)
2. Handmatig de kerndata invult (prijs, kamers, afstanden)
3. Afbeeldings-URLs direct uit de listing kopieert
4. De accommodatie direct in de database opslaat

### Optie C: Hybride aanpak (best of both)
- **Firecrawl** proberen voor ondersteunde sites (HomeToGo, Agoda, kleinere platforms)
- **Admin quick-entry form** voor Booking/Airbnb waar je de essenti&euml;le velden handmatig invult
- **Bulk-import** via een JSON/CSV-template voor meerdere accommodaties tegelijk

## Aanbeveling

**Optie C** - Hybride. Concreet:

1. **Admin-pagina uitbreiden** met een "Accommodatie toevoegen"-formulier:
   - URL-veld (opslaan als `listing_url`)
   - Alle kernvelden: naam, prijs, kamers, badkamers, bedden, locatie, golf/strand-afstand
   - Tags (pool, airco, wifi, etc.) als checkboxes
   - Afbeelding-URLs invoerveld
   - Platform-badge (Booking, Airbnb, HomeToGo, direct)

2. **Optionele Firecrawl-scrape knop** naast het URL-veld:
   - Probeert metadata te extracten
   - Vult formuliervelden automatisch in waar mogelijk
   - Faalt gracefully: velden die niet geparsed kunnen worden blijven leeg voor handmatige invoer

3. **Accommodatie-bewerken** vanuit de admin: edit-knop per bestaande accommodatie om prijzen/beschikbaarheid bij te werken

### Wijzigingen
- `src/pages/Admin.tsx` — Nieuw accordion-panel "Accommodatie beheer" met add/edit formulier
- `supabase/functions/firecrawl-scrape/` — Edge function voor optionele scrape (alleen als Firecrawl-connector gelinkt is)
- `src/lib/api/firecrawl.ts` — Client-side API wrapper

### Benodigdheden
- Firecrawl-connector koppelen (optioneel, voor de auto-fill feature)
- Geen extra database-migraties nodig (accommodations-tabel bestaat al)

