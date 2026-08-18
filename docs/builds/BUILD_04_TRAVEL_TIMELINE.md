# BUILD 04 - Reis timeline

Status: implementation branch
Branch: `vakansie/build-04-travel-timeline`

## Goal

Introduce the generic chronological travel/booking model that replaces destination-specific travel structures.

## Core model

Create `public.trip_items` for factual or planned travel items. Supported product examples include flights, trains, ferries, stays, rental cars, transfers, activities, restaurants, events, tickets and custom items.

`type` is intentionally extensible text rather than a destination-specific enum. Customer-facing copy maps types to understandable labels/icons.

## Authorization

- trip membership is required to read items
- trip members may create items for themselves
- item creator or trip organizer may update/delete an item
- `trip_id` and `created_by` are immutable after insert
- platform admin remains an internal compatibility path through the existing role helper
- RLS, not UI state, is the authorization boundary

## Frontend

`/trip/:tripId/reis` becomes the generic timeline.

Required flows:
- empty state
- add travel item
- edit own/organizer-editable item
- delete with confirmation
- chronological grouping by day where dates exist
- undated items shown separately
- useful human labels, never `trip_items` or internal type names as product copy

## Legacy migration rule

Do not convert prototype suggestions into booking facts.

- legacy `travel_legs` may be mapped through a read-only adapter during transition
- legacy passenger-name arrays must not become relational identity in the new model
- legacy accommodation candidates are not migrated automatically; only a later explicit confirmed-booking migration may create a `stay`
- every persisted new item must be intentional and UUID/trip scoped

## Data fields

Target `trip_items` fields:
- id
- trip_id
- type
- title
- status
- start_at / end_at
- timezone
- location_name / address / coordinates
- provider
- booking_reference / booking_url
- price / currency
- notes
- metadata
- created_by
- created_at / updated_at

## Acceptance criteria

### Database
- forward-only migration creates `trip_items`
- RLS enabled
- indexes for trip/time access
- updated_at trigger
- immutable identity trigger
- migration registered in Supabase migration history
- generated TypeScript schema representation synchronized

### Authorization tests
- organizer/member of a trip can read its items
- authenticated outsider reads zero rows
- outsider insert is denied
- organizer can create/update/delete a test item
- all test data is rolled back

### Product
- Reis page uses new model as primary source
- add/edit form uses normal travel language
- no Malaga/Costa del Sol/golf-specific assumptions in new travel feature
- legacy data is clearly transitional and cannot silently become a booking fact

### Quality
- typecheck
- Edge Function checks
- lint
- tests
- production build

## Merge rule

Do not merge frontend code until the production database migration has been applied and authorization tests pass. Do not weaken RLS to make the UI work.
