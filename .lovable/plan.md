
# Malaga Afvalrace 🏌️‍♂️🏖️

Een mobile-first webapp waarmee 5 vrienden samen de perfecte accommodatie kiezen voor hun golfreis naar Malaga (2-5 april 2026). Via een "afvalrace" in 3 rondes wordt de groep snel naar een keuze geleid.

---

## Backend Setup (Lovable Cloud / Supabase)

### Database tabellen
- **profiles** – id, username, displayName, role (participant/admin)
- **trip** – vaste reisgegevens (data, groepsgrootte, vluchtnotes, golf rondes)
- **submissions** – 1 per user, alle intake antwoorden + locked status
- **accommodations** – alle accommodatie data inclusief foto's, bronnen, locatie, stats, status
- **admin_overrides** – log van admin wijzigingen

### Accounts
5 vooraf aangemaakte accounts met username/password login:
- Robin, Mark, Dimitri, Edwin (participants) + Admin (Hans)

### Beveiliging
- Row Level Security: users zien alleen eigen submission, admin ziet alles
- Submissions worden gelocked na invullen

---

## Pagina's

### 1. Login
- Simpel loginscherm met username + password
- Na login: doorsturen naar Intake (als nog niet ingevuld) of Info pagina

### 2. Info pagina
- Korte, leuke uitleg van het doel: "1 verblijf kiezen voor 5 man, golf én omgeving"
- Uitleg van de 3 rondes (Sloperhamer → Scorebord → Reality Check)
- Consequenties uitgelegd: huurauto vs taxi life, golf-base vs strand-base
- Checklist voor de top 3 (bedden, prijs, parkeren, annulering, reviews)

### 3. Intake (1 pagina, alles in 1 keer)
- **Blok A**: Akkoord met vaste gegevens + keuze 2 of 3 rondes golf
- **Blok B**: Kill criteria – mobiliteit, base locatie, max reistijd golf, bedden, slaapkamers, annulering, prijstransparantie, budget cap
- **Blok C**: 100 punten verdelen over 6 factoren (golf gemak, strand/avondleven, omgeving, comfort, budget, minimaal gedoe) met live teller
- Na submit: locked, read-only, bevestiging

### 4. Accommodaties (voor iedereen)
- **Overzicht**: Cards met foto carousel, key stats, eligible/not-eligible badges, golf-base/strand-base labels
- **Sorteren**: op ranking score, prijs, golfminuten, strandafstand
- **Filters**: eligible only, slaapkamers, annuleringstype, locatie
- **Detail pagina**: grote foto carousel, kaart met pin (lat/lng), alle stats, criteria pass/fail uitleg, bronnen als "Open bron" cards

### 5. Admin Dashboard (alleen Admin)
- **Completion overzicht**: wie heeft wel/niet ingevuld
- **Majority view**: stemverdeling per kill criterium, mobiliteit, base, rondes
- **Gemiddelde punten** per factor
- **Afvalrace controls**:
  - Ronde 1 Sloperhamer: filter eligible accommodaties
  - Ronde 2 Scorebord: bereken ranking, toon top N
  - Ronde 3 Reality check: admin selecteert finalisten
- **Accommodaties tabel**: met elimineer/undo, edit, toggle prijsbevestiging
- **Admin override log**: wijzigingen met badge, reden en timestamp

---

## Scoring & Ranking
- Gemiddelde punten per factor uit alle submissions
- Per accommodatie een matchscore (0-1) per factor op basis van stats
- Totaalscore = som van (gemiddelde punten × matchscore)
- Top accommodaties tonen 3 bullets met grootste score-bijdragers

---

## Seed Data
8 accommodaties vooraf ingeladen:
1. Matchroom Country Club (Mijas)
2. HigueronRentals Mimosa (Fuengirola)
3. Casa Linda (La Cala de Mijas)
4. La Cala Resort (La Cala Golf)
5. Solana Village (La Cala Golf)
6. + 3 placeholders (beach, golf, budget)

Alle met Unsplash placeholder foto's, lat/lng, bronnen en stats. Admin kan later bijwerken.

---

## Design
- Mobile-first, snel, simpel, fun
- Geen lange teksten
- Foto carousels op alle accommodatie views
- Kaart pins voor locaties
- Duidelijke eligible/niet-eligible badges met uitleg welke criteria falen
