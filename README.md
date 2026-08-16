# Malaga 

Bouw een mobile-first webapp “Malaga Afvalrace” voor 5 gebruikers met eigen accounts en 1 admin. Doel: in x minuten een gezamenlijke keuze maken voor accommodatie voor 5 volwassenen (2 april tot 5 april, 3 nachten) met minimaal 2 en mogelijk 3x 18 holes bij La Cala Golf, plus omgeving zien (strand, dorp, stad). Iedereen moet in 1 keer alles kunnen invullen in één intake scherm. Daarna is de input locked. Admin ziet de uitslag en kan de scope verkleinen (afvalrace rondes), en accommodaties vergelijken met foto’s, locaties, afstanden en meerdere bronnen per accommodatie. Admin kan unlock en

CONTEXT (vaste gegevens)
- Reisdata: 2026-04-02 t/m 2026-04-05
- Groep: 5 volwassenen
- Vluchten: 3 man arriveert donderdag ( Robin, Mark, Dimitri) ochtend, 

2 man donderdag middag ( Edwin Hans) 

(toon dit als vaste tekst)


- Golf: minimaal 2x 18 holes, misschien 3x 18 holes

ACCOUNTS (maak deze users aan)
Gebruik username + password login (als alleen email kan, gebruik robin@local, etc, maar toon username in UI).
- username: Robin     password: neusjevandezalm        role: participant
- username: Mark      password: allesinboxdrie         role: participant
- username: Dimitri   password: onebunge               role: participant
- username: Edwin     password: hetisgeelennietzwaar   role: participant
- username: Admin     password: hans                   role: admin

PAGINA’S
1) Login
- Simpele login met username + password.
- Na login: nav naar Info of Intake afhankelijk van status (als submission nog niet bestaat, naar Intake).

2) Info (kort, leuk, niet saai)
Doeltekst (kort):
- “We kiezen 1 verblijf dat werkt voor 5 man. Golf én omgeving. Snel beslissen en boeken.”

Game in 3 rondes:
- Ronde 1 Sloperhamer: kill criteria filtert alles dat niet kan.
- Ronde 2 Scorebord: punten bepalen ranking.
- Ronde 3 Reality check: top 3 check op bedden, echte totaalprijs, regels. Daarna boeken.

Consequenties (auto vs taxi life):
- Huurauto: vrijheid voor strand, Mijas Pueblo, Marbella, Málaga, makkelijke golfdagen. Consequentie: parkeren en iemand moet rijden, plus 2 aankomsttijden (ochtend/middag).
- Taxi life: niemand rijdt. Consequentie: ritten naar golf stapelen snel op, soms 2 taxi’s voor 5 man.

Consequenties (golf-base vs strand-base):
- Golf-base: maximaal golf gemak, rustiger avonden, vaker rijden voor strand/leven.
- Strand-base: lopen naar eten en strand, golfdagen rijden naar La Cala.

Checklist top 3:
- Bedden en slaapkamers kloppen echt voor 5 volwassenen.
- Totaalprijs is all-in (fees, schoonmaak, tax, borg, parkeren duidelijk).
- Parkeren geregeld als auto.
- Annulering ok (geen nonref tenzij iedereen het wil).
- Recente reviews en realistische check-in.

3) Intake (1 pagina, alles in 1 keer invullen)
Blok A Vaste gegevens akkoord:
- Checkbox verplicht: “Ik ga akkoord met de vaste gegevens”
- Keuze verplicht: “Ik verwacht 2 rondes” of “Ik verwacht 3 rondes”
- Opmerking (optioneel)

Blok B Kill criteria (must haves, knock-out):
- Mobiliteit keuze (verplicht): Huurauto / Transfers+taxis / Geen voorkeur
- Base keuze (verplicht): Golf-base (La Cala Golf) / Strand-base (La Cala de Mijas of Calahonda) / Geen voorkeur
- Max reistijd naar La Cala Golf (verplicht): 10 / 15 / 20 minuten
- 5 vaste bedden vereist: ja/nee
- 3 slaapkamers vereist: ja/nee
- Annuleerbaar vereist: ja/nee (non-refundable = afkeur als vereist)
- Prijs transparant vereist: ja/nee (all-in duidelijk)
- Budget cap verblijf (optioneel, nummer)
- Opmerking (optioneel)

Blok C 100 punten verdelen (wanna haves):
- Golf gemak
- Strand/avondleven
- Omgeving ontdekken
- Comfort/luxe
- Budget laag
- Minimaal gedoe

Validatie:
- Akkoord checkbox verplicht
- Totaal punten exact 100 (toon live teller zoals 83/100)
- Verplichte keuzes moeten ingevuld zijn
Na submit:
- Lock de submission (read-only)
- Toon bevestiging en link naar Resultaten (of terug naar Info)

4) Accommodations (voor iedereen leesbaar)
- Lijst met accommodatie cards met foto carousel, kernstats en badges:
  - Eligible / Not eligible (op basis van groep)
  - Golf-base / Strand-base label (op basis van locationLabel)
- Sorteren op: ranking score (default), prijs, golfMinutes, beachMeters
- Filters: Eligible only, slaapkamers >=3, annuleringstype, base locatie
- Detail pagina per accommodatie:
  - Grote foto carousel (minstens 4 foto’s als beschikbaar)
  - Kaart met pin (Google Maps embed of Mapbox) op lat/lng
  - Stat blok: prijs, slaapkamers, badkamers, vaste bedden, parkeren, annulering, golfMinutes, beachMeters, agpMinutes
  - “Waarom wel/niet”: lijst met criteria die gehaald worden of falen
  - “Bronnen”: cards per bron met label + note + knop “Open bron”
  - Embeds: probeer alleen embeds voor kaarten en eventueel video’s; voor Booking/Airbnb/TripAdvisor meestal geen iframe. Zet canEmbed standaard false voor deze bronnen en toon alleen “Open bron”.

5) Admin Dashboard (alleen Admin)
- Completion: wie heeft ingevuld ja/nee
- Majority view:
  - Voor elk kill criterium toon meerderheid (>=3) en toon exacte stemverdeling
  - Toon verdeling mobilityChoice (car/transfers/neutral) en baseChoice (golf/beach/neutral)
  - Toon verdeling 2 rondes vs 3 rondes
- Gemiddelde punten per factor over alle submissions
- Afvalrace controls:
  - Knop “Run Round 1 Sloperhamer”: filter eligible en markeer afgevallen (zonder delete)
  - Knop “Run Round 2 Scorebord”: bereken ranking en toon top N (default 5)
  - Knop “Run Round 3 Reality check”: admin selecteert top 3 en zet status “finalist”
- Accommodations tabel:
  - columns: name, locationLabel, bedrooms, fixedBedsCount, cancellationType, parking, golfMinutes, beachMeters, totalPrice3Nights, eligible, score
  - actie: Elimineer (met reden) / Undo
  - actie: Toggle transparentPriceConfirmed
  - actie: Edit accommodatie (foto’s, url, lat/lng, stats)
- Admin override:
  - Admin mag groeps-eisen overrulen (bijv. maxGolfMinutes) maar:
    - Toon “Admin override” badge + reden + timestamp in een log

DATA MODEL
A) users
- id, username, role, displayName

B) trip (single record)
- startDate, endDate, groupSize, flightsNote, golfMin=2, golfMax=3

C) accommodations
Velden:
- id
- name
- type (hotel, apartment, villa, townhouse, resort)
- locationLabel (La Cala Golf, La Cala de Mijas, Calahonda, Fuengirola, Mijas etc)
- lat, lng (required)
- imageUrls[] (array of direct image URLs or hosted assets)
- listingUrl (primary)
- sources[] (array of objects):
  - { label, type, url, canEmbed, note }
  types: official, booking, airbnb, reviews, vrbo, other
- totalPrice3Nights (number, optional)
- currency (EUR)
- priceNotes (string)
- bedrooms, bathrooms, fixedBedsCount, maxGuests
- cancellationType (free, partial, nonref, unknown)
- parking (yes, no, unknown)
- golfKm, golfMinutes
- beachMeters
- agpMinutes
- notes (string)
- tags[] (array)
- status (active, eliminated, finalist)
- eliminatedReason (string)
- transparentPriceConfirmed (bool)

D) submissions (1 per user)
- id
- userId
- agreedFacts (bool)
- preferredRounds (2 or 3)
- mobilityChoice (car, transfers, neutral)
- baseChoice (golf, beach, neutral)
- maxGolfMinutes (10, 15, 20)
- requireFixedBeds (bool)
- requireBedrooms3 (bool)
- requireCancelable (bool)
- requireTransparentPrice (bool)
- budgetCapTotal (number, optional)
- pointsGolfEase
- pointsBeachLife
- pointsExploring
- pointsLuxury
- pointsBudget
- pointsLowHassle
- locked (bool)
- createdAt

E) adminOverrides (log)
- id, adminUserId, field, oldValue, newValue, reason, createdAt

GROUP RULES (AFVALRACE)
Kill criteria groeps-eis via meerderheid:
- Voor elk kill veld: als >=3 submissions “requireX=true” dan groeps-eis true
- maxGolfMinutes: neem de strengste meerderheid (bijv. median of majority choice)
- mobility/base: gebruik majority voor “consequenties” tekst, niet als harde eligibility tenzij admin dat aanzet

Eligibility rules:
- if group requires fixed beds: accommodation.fixedBedsCount >= 5
- if group requires 3 bedrooms: accommodation.bedrooms >= 3
- if group requires cancelable: accommodation.cancellationType != nonref
- if group requires transparent price: accommodation.transparentPriceConfirmed == true OR accommodation.totalPrice3Nights is not null
- if group maxGolfMinutes set: accommodation.golfMinutes <= group.maxGolfMinutes
- if group budget cap set: accommodation.totalPrice3Nights <= cap (als prijs onbekend, markeer “unknown budget” en laat admin kiezen)

RANKING SCORE (punten)
1) Neem gemiddelde punten per factor over alle submissions.
2) Maak per accommodatie matchscore 0.0 tot 1.0:
- golfEase:
  1.0 if golfMinutes <= 5
  0.7 if <= 12
  0.4 if <= 20
  0.1 otherwise
- beachLife:
  1.0 if beachMeters <= 800
  0.6 if <= 1500
  0.2 otherwise
- exploring:
  1.0 voor La Cala de Mijas, 0.8 voor Fuengirola, 0.7 voor Calahonda, 0.4 voor La Cala Golf (rustiger), 0.6 default
- luxury:
  1.0 if bathrooms >=2 AND tags contains "pool" or "spa"
  0.7 if bathrooms >=2
  0.4 otherwise
- budget:
  normaliseer totalPrice3Nights binnen actieve set: goedkoopste 1.0, duurste 0.2, onbekend 0.5
- lowHassle:
  score op basis van (parking=yes), (cancellationType=free), (transparentPriceConfirmed=true):
  1.0 bij 3 van 3, 0.7 bij 2 van 3, 0.4 bij 1 van 3, 0.2 bij 0 van 3
3) Total score = Σ(avgPointsFactor * matchscoreFactor)
Toon uitleg bij top accommodaties: 3 bullets met grootste bijdragers aan de score.

UI EISEN
- Accommodatie cards met foto carousel, key stats, map preview, en knoppen: “Details” en “Open listing”
- Details pagina: foto carousel, map embed, stats, criteria pass/fail, sources cards
- Admin table met filters en eliminatie
- Mobile-first, snel, simpel, fun. Geen lange teksten.

SEED DATA (jullie al gevonden accommodaties + meerdere bronnen)
Maak minimaal deze entries aan (admin kan later verfijnen):

1) Matchroom Country Club
- name: Matchroom Country Club Resort
- type: resort
- locationLabel: Mijas
- lat: 36.54877
- lng: -4.65891
- bedrooms: 2
- bathrooms: 1
- fixedBedsCount: 5
- maxGuests: 5
- cancellationType: unknown
- parking: unknown
- golfMinutes: 15
- golfKm: 10
- beachMeters: 6000
- agpMinutes: 30
- listingUrl: https://www.tripadvisor.com/Hotel_Review-g580271-d1555407-Reviews-Matchroom_Country_Club-Mijas_Costa_del_Sol_Province_of_Malaga_Andalucia.html
- sources:
  - { label:"TripAdvisor", type:"reviews", url:"https://www.tripadvisor.com/Hotel_Review-g580271-d1555407-Reviews-Matchroom_Country_Club-Mijas_Costa_del_Sol_Province_of_Malaga_Andalucia.html", canEmbed:false, note:"Reviews en foto’s" }
  - { label:"Info site", type:"other", url:"https://matchroom-country-club-resort.hotelsinfuengirola.com/en/", canEmbed:false, note:"Extra foto’s en omschrijving" }
- imageUrls: gebruik placeholders als je geen directe urls hebt (Unsplash). Admin kan later vervangen.

2) HigueronRentals Mimosa
- name: HigueronRentals Mimosa
- type: apartment
- locationLabel: Fuengirola
- lat: 36.57935
- lng: -4.59838
- bedrooms: 3
- bathrooms: 2
- fixedBedsCount: 6
- maxGuests: 6
- cancellationType: unknown
- parking: unknown
- golfMinutes: 25
- golfKm: 18
- beachMeters: 1900
- agpMinutes: 25
- listingUrl: https://www.booking.com/hotel/es/dream-house-private-pool-sun-and-barbecue-beach.en-gb.html
- sources:
  - { label:"Booking", type:"booking", url:"https://www.booking.com/hotel/es/dream-house-private-pool-sun-and-barbecue-beach.en-gb.html", canEmbed:false, note:"Prijs en voorwaarden" }
  - { label:"Airbnb", type:"airbnb", url:"https://www.airbnb.com/rooms/703988367627331168", canEmbed:false, note:"Extra details, foto’s, regels" }
- imageUrls: placeholders (Unsplash) tot admin echte foto-urls toevoegt.

3) Casa Linda (La Cala de Mijas)
- name: Casa Linda - Luxury home in La Cala de Mijas
- type: house
- locationLabel: La Cala de Mijas
- lat: 36.504308
- lng: -4.678958
- bedrooms: 3
- bathrooms: 3
- fixedBedsCount: 5
- maxGuests: 6
- cancellationType: unknown
- parking: unknown
- golfMinutes: 15
- golfKm: 9
- beachMeters: 800
- agpMinutes: 35
- listingUrl: https://www.booking.com/hotel/es/casa-linda-luxury-home-in-la-cala-de-mijas.en-gb.html
- sources:
  - { label:"Booking", type:"booking", url:"https://www.booking.com/hotel/es/casa-linda-luxury-home-in-la-cala-de-mijas.en-gb.html", canEmbed:false, note:"Prijs en voorwaarden" }
- imageUrls: placeholders (Unsplash) tot admin echte foto-urls toevoegt.

4) La Cala Resort (baseline)
- name: La Cala Resort (Hotel baseline)
- type: hotel
- locationLabel: La Cala Golf
- lat: 36.535164
- lng: -4.71733
- bedrooms: 1
- bathrooms: 1
- fixedBedsCount: 2
- maxGuests: 2
- cancellationType: unknown
- parking: yes
- golfMinutes: 2
- golfKm: 1
- beachMeters: 8500
- agpMinutes: 35
- listingUrl: https://www.lacala.com/
- sources:
  - { label:"Official", type:"official", url:"https://www.lacala.com/", canEmbed:false, note:"Resort info" }
  - { label:"Golf", type:"official", url:"https://www.lacala.com/golf/", canEmbed:false, note:"Golf info" }
  - { label:"Booking", type:"booking", url:"https://www.booking.com/hotel/es/lacalaresort.en-gb.html", canEmbed:false, note:"Hotel listing" }
- imageUrls: placeholders (Unsplash) tot admin echte foto-urls toevoegt.

5) Solana Village (La Cala Golf area)
- name: Solana Village (La Cala Golf area)
- type: apartment
- locationLabel: La Cala Golf
- lat: 36.541822
- lng: -4.722268
- bedrooms: 3
- bathrooms: 2
- fixedBedsCount: 5
- maxGuests: 6
- cancellationType: unknown
- parking: yes
- golfMinutes: 5
- golfKm: 1
- beachMeters: 8500
- agpMinutes: 35
- listingUrl: https://www.booking.com/hotel/es/solana-village.en-gb.html
- sources:
  - { label:"Booking", type:"booking", url:"https://www.booking.com/hotel/es/solana-village.en-gb.html", canEmbed:false, note:"Listing" }
  - { label:"Developer", type:"other", url:"https://taylorwimpeyspain.com/nl/bezitting/solana-village-la-cala-golf-resort-mijas-malaga/", canEmbed:false, note:"Project info en visuals" }
- imageUrls: placeholders (Unsplash) tot admin echte foto-urls toevoegt.

Voeg daarnaast 3 extra placeholder accommodaties toe (1 beach, 1 golf, 1 budget) zodat ranking altijd werkt, met:
- lat/lng, minstens 4 Unsplash imageUrls, bedrooms>=3 bij beach en golf, en een listingUrl placeholder.

PLACEHOLDER IMAGES
Gebruik stabiele Unsplash links (direct image URLs) als tijdelijke foto’s. Zet in notes dat admin ze later vervangt met echte listingfoto’s of uploads.

BELANGRIJK
- Toon foto’s altijd in carousel (imageUrls)
- Toon locaties op kaart (lat/lng)
- Toon eligible / not eligible en exact welke criteria falen
- Toon top 3 met uitleg bullets
- Intake is 1 pagina en daarna locked
- De app werkt zonder embeds van Booking/Airbnb; toon bronnen als “Open bron” cards

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://malaga-magic-maker.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/862d0c06-04b0-4b84-979e-9da0c844e958).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
