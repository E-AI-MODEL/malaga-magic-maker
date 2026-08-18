# BUILD 03 - Trip lifecycle

Status: implementation branch
Branch: `vakansie/build-03-trip-lifecycle`

## Goal

Make trips manageable as independent product entities without introducing legacy destination assumptions or weakening the pre-launch access controls.

## In scope

- create a generic trip with destination, dates, travelers, country, currency and timezone defaults
- edit an existing trip as organizer
- archive and restore a trip as organizer
- separate active and archived trips in `Mijn reizen`
- explicit organizer-only trip settings route
- preserve URL `tripId` as the authority
- replace hardcoded frontend Hans gate constants with a named pre-launch access configuration module
- keep the database `block_non_hans_auth_user` guard enabled until BUILD 06 safely replaces the pre-launch gate

## Out of scope

- public signup/login changes
- new invite model
- `trip_items`
- legacy Malaga data migration/deletion
- billing
- platform Ops UI

## Naming

- internal/technical route may use `/settings`; customer heading is `Reisinstellingen`
- `archive` is shown as `Archiveren`
- pre-launch access mode is an internal concept and is not customer-facing copy

## Acceptance criteria

### Create
- a new trip can be created with only a name
- optional destination/country/dates are stored generically
- browser timezone is used as a sensible default without exposing IANA jargon to the user
- currency defaults to EUR but can be selected
- no fixed Malaga, golf, fixed group or person assumptions

### Edit
- organizer can open `/trip/:tripId/settings`
- current generic trip fields are populated
- invalid end-before-start date is blocked
- saved changes refresh the active trip and trips list
- member without organizer permission cannot use update capability

### Archive lifecycle
- organizer can archive a trip without deleting its data
- archived trips are separated from active trips on `/trips`
- archived trip can be restored
- archive/restore does not change membership or child data

### Pre-launch access
- current Hans-only client gate is represented by explicit configuration rather than duplicated magic constants
- current database signup guard remains in force
- no implication that Hans-only is the final product auth model

### Quality
- typecheck
- Edge Function checks
- lint
- tests
- production build
- no database migration in this build

## Merge rule

Do not merge while organizer lifecycle, archived separation or quality checks fail. Do not weaken auth/RLS to make UI operations work.
