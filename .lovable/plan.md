
# Fix: Pieter (en Edwin) kunnen intake niet verzenden

## Probleem
De kolom `submissions.preferred_rounds` is `NOT NULL` met default `2`. Wanneer een non-golfer (Pieter of Edwin) de intake indient, stuurt de code `preferred_rounds: null` mee in de payload. Dit overschrijft de database-default en veroorzaakt een NOT NULL constraint error, waardoor de insert faalt.

## Oplossing
In `src/pages/Intake.tsx` de submit-payload aanpassen: als de gebruiker een non-golfer is, stuur `preferred_rounds: 0` (of de default `2`) in plaats van `null`.

### Technische wijziging
**Bestand:** `src/pages/Intake.tsx`, regel 146

Huidige code:
```typescript
preferred_rounds: preferredRounds,
```

Nieuwe code:
```typescript
preferred_rounds: isNonGolfer ? 0 : preferredRounds,
```

Dit zorgt ervoor dat non-golfers altijd een geldige integer-waarde meesturen. De waarde `0` maakt ook duidelijk in de data dat deze persoon niet meedoet met golf.

Geen database-wijzigingen nodig.
