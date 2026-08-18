# BUILD 08 - Readiness and Hansie

## Goal

Make Vakansie answer the practical question "wat moet nog?" from deterministic trip facts, and make Hansie a generic authorized vacation-preparation assistant instead of the legacy Malaga destination guide.

## Customer language

Internal terms such as `readiness engine`, `context assembler`, `trip_items` and service-role must not appear in the UI.

Preferred customer language:
- `Nog 3 dingen regelen`
- `Klaar voor vertrek`
- `Vraag Hansie`
- `Wat moet ik nog regelen?`

## Readiness

The live database already contains `get_trip_readiness(p_trip_id uuid)` and migration history version `20260818090000`.

The function is deterministic and authorized. It checks:
- missing trip dates
- missing destination
- open tasks
- open decisions
- planned/unconfirmed booking-type travel items

It also returns factual counts for trip items, ready documents and members.

Restore the missing migration source file in GitHub without reapplying it.

## Trip overview

Trip Home uses `get_trip_readiness` as the single readiness source. Do not duplicate the business rules in React.

Show:
- human status
- attention count
- understandable check rows only when useful
- counts as supporting facts, not management-dashboard clutter

## Hansie

Hansie is read-only in this build.

Mandatory function order:
1. valid user token
2. user identity
3. explicit trip membership authorization
4. only then service-role reads
5. assemble bounded generic trip context
6. AI call

Authorized context may include:
- generic trip basics
- readiness result
- chronological `trip_items`
- tasks
- open decisions/options
- member count/profile display names where authorized
- expense summary
- ready document metadata only

Do not include legacy Malaga submissions, accommodation-candidate logic, golf fields or destination-specific app settings.

Hansie must:
- distinguish stored facts from suggestions
- never invent a booking
- not claim live weather/price/opening-hour/flight status without a live source
- never silently modify trip data
- answer in concise normal Dutch

## Widget

Replace the legacy Costa del Sol/golf menu with a small contextual assistant:
- `Vraag Hansie`
- suggested questions based on preparation, not destination assumptions
- no user-facing "AI Reisgids" label
- no technical context toggles

## Security acceptance

- foreign `tripId` remains 403 before private service-role reads
- malformed/unauthenticated request is rejected
- context contains no legacy prototype tables
- document content is never sent, only ready metadata
- bounded message/context payloads

## Quality

- typecheck
- Edge Function checks
- lint
- tests
- production build
- no Malaga/Costa del Sol/golf/fixed-person assumptions in new Hansie/readiness code
