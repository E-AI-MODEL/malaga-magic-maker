# BUILD 02 - Product shell

Status: implementation branch
Branch: `vakansie/build-02-product-shell`

## Goal

Stop presenting the Malaga prototype as the Vakansie product. Introduce the generic account/trip shell without doing deep legacy data migration yet.

## Naming contract

| Domain | Technical/work name | Intended customer language in this build |
|---|---|---|
| account trip collection | trips index | Mijn reizen |
| trip overview | Trip Home | Overzicht (nav icon may represent Home) |
| chronological travel facts | Reis domain | Reis |
| collaboration | Samen domain | Samen |
| contextual assistant | trip AI / Hansie | Hansie / Vraag Hansie |

Internal names such as `trip_items`, readiness engine, context assembler and ops must not leak into customer copy.

## In scope

- `/trips` as signed-in account landing page
- `/new-trip` for generic trip creation
- `/trip/:tripId` as trip overview shell
- `/trip/:tripId/reis` as generic travel shell
- `/trip/:tripId/samen` as collaboration shell
- URL `tripId` is authoritative for opened trip
- mobile primary nav contains only the three trip domains
- desktop sidebar mirrors the three domains
- Hansie is contextual/floating, not a primary nav page
- account/trip switch navigation
- no fixed Malaga/Costa del Sol/golf/person/date/accommodation assumptions in new shell
- existing legacy pages remain accessible only through explicit `/legacy/:tripId/...` routes during transition
- no deep legacy data migration
- no new permanent auth architecture in this build

## Out of scope

- `trip_items` schema (BUILD 04)
- generic decisions/expense normalization (BUILD 05)
- production signup/invites (BUILD 06)
- document model (BUILD 07)
- full Hansie context rebuild (BUILD 08)
- platform Ops UI (BUILD 09)
- deleting legacy Malaga schema/data

## Acceptance criteria

### Routing
- after login, user lands on `/trips`
- `/` redirects signed-in users to `/trips`
- opening a trip uses `/trip/:tripId`
- refreshing a trip route resolves the trip from the URL, not from localStorage
- unauthorized/non-member trip ID does not open private trip data
- create trip returns to `/trip/:tripId`
- join flow can return to `/trip/:tripId`

### Account experience
- `/trips` shows all trips available through membership
- no trip is implicitly treated as the whole application
- create-trip CTA is clear
- if there are no trips, a useful empty state is shown

### Trip shell
- header clearly identifies current trip and offers route back to all trips
- primary navigation is the Home/Reis/Samen architecture; final copy may be Overzicht/Reis/Samen
- no primary Reisgids/Info/Uitslag/Taken/Meer tabs
- Hansie remains available contextually

### New product pages
- trip overview uses only generic trip fields and generic counts from safe existing tables where useful
- Reis page contains a generic chronological-product empty/transition state and no Malaga-specific recommendations
- Samen page contains generic people/task collaboration summaries and no fixed participant names

### Legacy isolation
- current Malaga-specific pages are not linked from the new primary shell
- they may remain under `/legacy/:tripId/...` during migration
- new code does not import Malaga-specific page concepts as domain architecture

### Quality
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- no new schema migration in BUILD 02

## Merge rule

Do not merge while any acceptance criterion above is knowingly false. Do not solve shell problems by reintroducing fixed Malaga assumptions.