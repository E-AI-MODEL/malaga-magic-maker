
# Dilemma-keuze systeem voor de 100 punten

## Concept
De huidige sliders worden vervangen door een **Tinder-achtige dilemma-flow**: de gebruiker krijgt steeds twee tegels naast elkaar te zien en kiest welke ze belangrijker vinden. Na alle keuzes worden de resultaten automatisch omgerekend naar de 100-punten verdeling.

## Hoe het werkt

Met 6 categorieen zijn er **15 unieke paren** (elke categorie vs. elke andere). Per dilemma:
- Twee visueel aantrekkelijke tegels naast elkaar
- Gebruiker tikt op hun voorkeur
- Animatie naar het volgende paar
- Voortgangsbalk bovenaan (1/15, 2/15, etc.)

Na alle 15 keuzes: elke "win" levert punten op. De scores worden genormaliseerd naar exact 100 punten (afgerond op 5-en, conform het huidige systeem).

## Visueel ontwerp per tegel

Elke categorie krijgt een eigen icoon en korte beschrijving:
- **Golf gemak** - Dichtbij de baan, snel op de green
- **Strand en avondleven** - Zon, zee en stappen
- **Omgeving ontdekken** - Dorpjes, markten, cultuur
- **Comfort en luxe** - Mooi verblijf, zwembad, ruimte
- **Budget laag houden** - Zo voordelig mogelijk
- **Gemak en ontzorging** - Alles geregeld, geen gedoe

Tegels worden gestyled als donkere kaarten met iconen, passend bij het bestaande dark-section design van blok C.

## Flow in de UI

```text
+-------------------------------------+
|  C · Wat vind jij belangrijk?       |
|  Kies steeds wat je belangrijker    |
|  vindt                               |
|                                      |
|  ████████░░░░░░░░  5 / 15           |
|                                      |
|  +---------------+ +---------------+ |
|  |   icon        | |   icon        | |
|  |               | |               | |
|  | Golf gemak    | | Strand &      | |
|  |               | | avondleven    | |
|  | Dichtbij de   | | Zon, zee en   | |
|  | baan          | | stappen       | |
|  +---------------+ +---------------+ |
|                                      |
+-------------------------------------+
```

Na afloop: een samenvatting met de berekende punten en een "Opnieuw" knop.

## Technische aanpak

### 1. Intake pagina aanpassen
- Verwijder de slider/plus-min sectie uit blok C
- Voeg een nieuwe `DilemmaGame` component toe
- Genereer alle 15 paren bij mount
- Shuffle de volgorde voor variatie
- Track keuzes in lokale state

### 2. Score-berekening
- Elke keuze = +1 punt voor de winnaar
- Max score per categorie = 5 (wint van alle andere)
- Normaliseer totaal naar 100, afgerond op 5-en
- Sla op in dezelfde `points_*` kolommen in de database

### 3. Resultaat-scherm
Na 15 keuzes verschijnt een overzicht:
- Staafdiagram of ranking van de 6 categorieen
- Totaal = 100 punten
- Knop "Opnieuw kiezen" om te resetten
- De punten worden meegenomen in de submit

### 4. Database
Geen wijzigingen nodig. De dilemma-resultaten worden omgezet naar dezelfde `points_golf_ease`, `points_beach_life`, etc. kolommen die al bestaan.

### Bestanden die worden aangepast
- **`src/pages/Intake.tsx`** - Blok C vervangen door DilemmaGame component
- **`src/components/DilemmaGame.tsx`** (nieuw) - De volledige dilemma-flow met tegels, animaties, voortgangsbalk en resultaatscherm
