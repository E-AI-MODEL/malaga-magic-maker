# Volledige verificatie voor livegang

Kort en eerlijk: nee, 100% garantie kan ik niet geven. Wat ik heb getest, heb ik echt getest; wat ik niet heb getest, weet ik niet.

## Wat aantoonbaar is geverifieerd
- Inloggen (e-mail en Google), reis aanmaken, reis openen.
- Documenten: upload PDF/PNG, openen via tijdelijke privelink, verwijderen.
- Emoji-scan over actieve pagina's en productiedata: schoon.
- Beveiliging: lidmaatschapscontrole op de documentfunctie, RLS-checks eerder aangetoond.
- Typecheck en de volledige testsuite slagen.

## Wat nog niet end-to-end op productie is bewezen
- Documenten uitlezen: net gedeployd, nog niet met een echt document op de gepubliceerde site doorlopen (uitlezen, voorstel, toevoegen aan tijdlijn, afwijzen).
- Betalen: complete Stripe-checkout in live modus met een echte kaart, plus webhook die Pro toekent.
- Uitnodigen: tweede gebruiker die via een uitnodigingslink binnenkomt en de juiste rechten krijgt.
- Plan-limieten: gratis gebruiker die tegen de reislimiet en het Hansie-dagmaximum aanloopt.
- Beheer: Pro toekennen/intrekken, functieschakelaars, verwijderen van reis/gebruiker.
- Verwijderde randgevallen: wachtwoord vergeten, account met meerdere reizen, offline/trage verbinding.

## Voorstel: verificatieronde op productie
1. Documentflow: upload een echte boekingsbevestiging, controleer uitlezing, voorstel accepteren en afwijzen.
2. Betaalflow: checkout doorlopen, webhook en entitlement controleren, daarna terugdraaien.
3. Uitnodigingsflow: tweede testaccount uitnodigen, rechten controleren, daarna opruimen.
4. Limieten: gratis account tegen reislimiet en Hansie-quotum laten lopen.
5. Beheer: elke schakelaar aan/uit en de admin-acties doorlopen.
6. Mobiel 393px en desktop: consolefouten en overflow controleren op alle hoofdschermen.

Alles wat wordt aangemaakt tijdens de test wordt daarna opgeruimd. Ik rapporteer per stap PASS/FAIL met de letterlijke fout erbij.

## Technisch
Uitvoering met Playwright tegen de gepubliceerde site plus directe controles op de database (entitlements, trip_documents, trip_items, ai_usage_events). Geen codewijzigingen tenzij een test faalt; dan meld ik eerst de fout.
