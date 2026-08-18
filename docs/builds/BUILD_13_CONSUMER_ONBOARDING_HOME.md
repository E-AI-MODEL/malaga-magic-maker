# BUILD 13 - Consumer onboarding and trip home

## Goal

Make the first minutes in Vakansie feel like a consumer product rather than an admin form/dashboard.

This build does not change the database, RLS, authentication model or core trip domains.

## Scope

### Mijn reizen
- make the value proposition clear before a user opens a trip
- add an obvious account/profile entry point
- make active trip cards more informative with destination, dates and human trip timing
- keep archived trips secondary and collapsed by default
- improve the zero-active-trip state without adding marketing pages

### Nieuwe reis
- replace the single long form with a short two-step start
- step 1 asks only for trip name and optional destination/country
- step 2 contains optional dates, travelers, currency and note
- make it explicit that optional details can be completed later
- preserve the existing create-trip contract and validation
- no new signup or onboarding database state

### Reisoverzicht
- make trip timing/countdown immediately understandable
- put deterministic readiness at the center
- make the first unresolved readiness item actionable
- route missing dates/destination to Reisinstellingen, tasks/decisions to Samen and booking attention to Reis
- keep next travel item, collaboration status and recent activity visible but secondary
- do not introduce percentages or AI-generated readiness

## Product language

Customer-facing terms in this build:
- Mijn reizen
- Nieuwe reis
- Overzicht
- Reis
- Samen
- Voor vertrek
- Nog regelen
- Reisinstellingen

Do not expose readiness engine, trip_items, platform ops or other implementation terms.

## Non-goals

- no schema migrations
- no pricing/billing
- no new notification types
- no changes to invite/auth security
- no Reis or Samen domain redesign yet
- no destination imagery or external content dependency

## Acceptance

- `/trips` remains the signed-in landing page
- a first-time user can understand the product and reach `Nieuwe reis` without opening another menu
- a trip can still be created with only a name
- the two-step form has accessible labels and keyboard-submittable controls
- after creation the user lands on `/trip/:tripId`
- readiness remains database-derived
- the primary readiness action routes to the correct generic domain
- archived Malaga stays out of the active first impression
- mobile first, desktop functional
- typecheck, Edge Function checks, lint, tests, production build and runtime dependency audit pass
