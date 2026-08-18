# BUILD 11 - Legacy retirement

## Goal

Remove the Malaga prototype from the production product experience without destroying historical data that may still be useful for verification or export.

## Current legacy state

The original trip `e7977afa-93ea-4a9c-a9da-de9c305e5860` is still a planning trip named `Malaga 2026`.

Its legacy data currently includes:
- 3 `travel_legs`
- 7 accommodation-candidate rows
- 1 legacy intake/submission
- 4 tasks in the shared tasks table
- 1 expense using old text participant fields
- 0 generic `trip_items`
- 0 generic decisions
- 0 normalized expense splits

Because generic parity is incomplete for those historical rows, this build does **not** delete the legacy tables or rows.

## Retirement approach

1. Archive the known legacy Malaga trip with a one-time, idempotent data migration.
2. Keep archived trips out of the main active experience and make the archive collapsed/secondary.
3. Remove all `/legacy/:tripId/*` routes and prototype lazy imports from the production router.
4. Keep old URLs safe by redirecting them to `/trips`.
5. Remove the legacy `travel_legs` fallback from the generic Reis page.
6. Remove the legacy permanent `trip.invite_code` display from Profile; secure invitations use the BUILD 06 invitation model.
7. Remove the unused legacy `AiChatWidget.tsx`; the active product uses the contextual `HansieWidget`.
8. Leave legacy database tables intact behind their existing RLS until a separately verified export/schema-removal migration is approved.

## Product result

A normal user sees:
- Mijn reizen
- new generic trip creation
- generic Overzicht / Reis / Samen
- archived legacy trip only inside a collapsed Archief area

No old Taken/Reisgids/Info/Uitslag/Intake/accommodation-game pages are reachable in production navigation or routing.

## Data safety

No historical legacy row is deleted in this build.
The one-time archive migration targets the exact known legacy trip id and only changes its status to `archived` if the row still exists.

## Acceptance

- Malaga legacy trip is archived live
- active trip list no longer presents it as an active product trip
- prototype routes cannot be opened
- generic Reis no longer reads `travel_legs`
- Profile no longer displays the old permanent invite code
- no legacy page is imported by `src/App.tsx`
- all existing legacy rows remain in the database
- typecheck, Edge Function checks, lint, tests and production build pass
