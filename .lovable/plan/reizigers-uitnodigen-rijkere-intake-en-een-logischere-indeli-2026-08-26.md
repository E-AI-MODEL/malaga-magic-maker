# Reizigers uitnodigen, rijkere intake en een logischere indeling

Drie dingen aanpakken: mensen kunnen toevoegen (mail én link), voorkeuren per reiziger die Hansie echt gebruikt, en een duidelijkere paginastructuur.

## 1. Reizigers uitnodigen — nu nergens bereikbaar

De uitnodigingsfunctie bestaat volledig in de backend (aanmaken, previewen, accepteren, intrekken) en er is een kant-en-klare kaart voor in de app, maar die kaart wordt op geen enkele pagina getoond. Daardoor kun je in de praktijk niemand toevoegen.

Wat er komt:
- Bij **Samen > Reizigers** een knop "Reiziger uitnodigen" en daaronder de openstaande uitnodigingen (alleen voor de organisator).
- Twee manieren in hetzelfde scherm:
  - **Per e-mail** — uitnodiging vast aan één adres, alleen dat adres kan accepteren.
  - **Via deelbare link** — kopieerbare link, instelbaar aantal gebruikers en geldigheidsduur, intrekbaar.
- Openstaande uitnodigingen tonen status (verzonden / gebruikt / verlopen / ingetrokken) met "Intrekken" en "Link kopiëren".
- Wie de link opent en nog geen account heeft, doorloopt gewoon registreren (naam + wachtwoord kiezen, of Google) en komt daarna direct in de reis. Dat pad bestaat al; we maken de teksten op de uitnodigingspagina expliciet ("account aanmaken" vs "inloggen") en tonen naam- en wachtwoordvelden in één stap.
- Bij een gearchiveerde reis blijft alles alleen-lezen.

## 2. Reisprofiel: wensen en voorkeuren per reiziger

Nieuw onderdeel waarin iedere reiziger zijn eigen voorkeuren invult, gekoppeld aan de reis (niet aan het account, want per reis kunnen wensen verschillen).

Per reiziger:
- Prioriteiten voor deze reis (bv. rust, natuur, cultuur, uitgaan, sport, kindvriendelijk) — meerkeuze, kort.
- Eten en drinken: dieetwensen en allergieën.
- Manier van reizen: comfortniveau, budgetgevoel, tempo.
- Vrij tekstveld "Waar moeten we rekening mee houden?".
- Mobiliteit/toegankelijkheid (optioneel).

Gedrag:
- De hoofdboeker vult dit in tijdens **Nieuwe reis** (nieuwe, overslaanbare stap).
- Een uitgenodigde reiziger krijgt hetzelfde formulier eenmalig te zien direct na het accepteren, en kan het later altijd aanpassen bij Samen.
- Bij Samen > Reizigers zie je per persoon of het profiel ingevuld is, met een nette samenvatting.
- Iedereen ziet elkaars profiel binnen de reis; je bewerkt alleen dat van jezelf (organisator kan niemand overschrijven).

**Effect op Hansie:** deze voorkeuren gaan mee in de reiscontext, zodat antwoorden, accommodatie-zoekresultaten en suggesties rekening houden met bijvoorbeeld "twee vegetariërs, één rolstoelgebruiker, groep wil rust boven uitgaan". Hansie blijft onderscheid maken tussen vastgelegde feiten en suggesties.

## 3. Intake "Nieuwe reis" uitbreiden

Van 2 naar 3 stappen, waarbij alleen de naam verplicht blijft:
1. **Reis** — naam, bestemming, land (ongewijzigd).
2. **Wanneer en met wie** — data, valuta, notitie, plus reisgezelschap (solo / samen / gezin / vrienden / zakelijk) en direct e-mailadressen of een deelbare link om reizigers uit te nodigen.
3. **Jouw wensen** — het reisprofiel uit punt 2, met duidelijke "Later invullen"-optie.

Reisgezelschap bepaalt daarna welke standaardsuggesties je op Overzicht ziet; er worden geen taken of keuzes automatisch aangemaakt zonder dat je erom vraagt.

## 4. Logischere indeling

De klacht dat de gelaagdheid onlogisch voelt, pakken we aan zonder nieuwe navigatie-items:
- **Overzicht** blijft één antwoord op "hoe staat het ervoor": aftellen, wat vraagt aandacht, eerstvolgende item, herinneringen.
- **Reis** = alles wat vaststaat of geboekt moet worden: tijdlijn, verblijf zoeken, boeking plakken, documenten.
- **Samen** = alles wat met mensen te maken heeft: Reizigers (inclusief uitnodigen en profielen) bovenaan in plaats van onderaan, daarna Taken, Keuzes, Kosten.
- **Reisinstellingen** wordt puur eigenschappen van de reis (naam, data, bestemming, valuta, archiveren) en verwijst voor mensen naar Samen.
- Elke sectiekop krijgt één duidelijke primaire actie, zodat het niet meer zoeken is waar je iets toevoegt.

## Technisch

- Nieuwe tabel `trip_traveler_profiles` (trip_id, user_id, prioriteiten, dieet, allergieën, tempo/comfort, mobiliteit, vrije notitie) met GRANTs en RLS: lezen door reisleden, schrijven alleen eigen rij.
- Kolom `party_type` op `trip` voor reisgezelschap.
- `TripInvitesCard` wordt uitgebreid met de link-variant en ingebouwd in Samen; bestaande RPC's (`create_trip_invite`, `revoke_trip_invite`, `accept_trip_invite`, `get_trip_invite_preview`) blijven ongewijzigd.
- `trip-ai-chat` en `accommodation-search` krijgen de reizigersprofielen mee in de contextopbouw, na de bestaande membership-check.
- Geen wijziging aan authenticatiemodel, plan-limieten of betalingen.

## Controle achteraf

Typecheck, lint, tests en productiebuild, plus een doorloop op 390px: uitnodiging per mail en per link maken, accepteren met een tweede account, profiel invullen, en controleren dat Hansie de voorkeuren benoemt.
