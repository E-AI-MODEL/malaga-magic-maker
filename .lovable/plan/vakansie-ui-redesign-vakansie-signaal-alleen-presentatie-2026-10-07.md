# Vakansie UI-redesign: "Vakansie Signaal" (alleen presentatie)

De bijlage is een goed plan: zuiver UI/UX, harde grenzen (geen copy-, logica-, schema- of route-wijzigingen), token-first aanpak, en een verstandige eis om eerst te bewijzen dat de grens begrepen is. We voeren het in twee fasen uit.

## Aandachtspunten uit de bijlage (vastgelegd, geen blokkade)

- Het moodboard toont een andere onderbalk (Home/Kaart/+/Groep/Meer) en een zwevende knop. Dat is sfeerreferentie, geen specificatie: de app behoudt exact Overzicht / Reis / Samen en de Hansie-vraagbalk (geen zwevende knop).
- Er komt geen kaartscherm, geen nieuwe functies, geen nieuwe foto's of API's.
- Bestaande teksten blijven letterlijk staan.

## Fase 1 — Inventarisatie (geen codewijzigingen)

Een rapport met:
1. De UI-tokens die veranderen (kleuren, typografie, radius, schaduwen in `src/index.css` en `tailwind.config.ts`).
2. De gedeelde componenten die herstijld worden (`primitives.tsx`, knoppen, rijen, badges, formulieren, sheets, BottomNav, AppLayout, HansieWidget).
3. De schermen die geraakt worden (Mijn reizen, Overzicht, Reis, Samen, Profiel, Beheer, login/landing).
4. Expliciete bevestiging dat er geen functionele of inhoudelijke wijzigingen nodig zijn.

## Fase 2 — Implementatie (na akkoord op fase 1)

Visuele richting uit de bijlage:
- Warm off-white basis (#F6F4ED), near-black tekst (#1C1F1E), signaaloranje (#FF6A00) als actiekleur, diep groen (#0F5D3A) voor positief/geregeld, blauw (#3B86FF) alleen voor route/locatie/info.
- Typografie: condensed display (Barlow Condensed ExtraBold) spaarzaam voor koppen, leesbare sans voor de app, compacte utility-typografie voor datums/labels/metadata. Bestaande teksten ongemoeid.
- Scherpere geometrie, minder grote ronde kaarten, haarlijnen en duidelijke hiërarchie, compactere informatiedichtheid.
- Reismotieven (tickets, codes, stempels, pijlen) als subtiele accenten; geen outdoor/wandel-imagery als merkidentiteit.
- Reizigers zonder avatar krijgen initialen (bestaande fallback behouden).
- Beheer blijft visueel apart en operationeel.

Harde regel tijdens implementatie: als een voorgestelde wijziging inhoud, functionaliteit, data, logica of de betekenis van een interactie vereist, wordt die wijziging niet gedaan.

## Verificatie

- Typecheck, lint, tests en productiebuild groen.
- Visuele controle op 390px (mobile-first) en desktop.
- Bestaande contracttests (build 14/16A/16B/17) moeten blijven slagen; waar een test uitsluitend oude kleur-/stijlwaarden vastlegt, wordt alleen die stijlassertie bijgewerkt.

## Volgorde

1. Fase 1-rapport (deze ronde, geen code)
2. Tokens en gedeelde componenten
3. Schermen consument (Mijn reizen, Overzicht, Reis, Samen, Profiel)
4. Hansie-uiterlijk en navigatie
5. Beheer en verificatie
