# BUILD 10 - Activity and notifications

## Goal

Turn meaningful trip changes into a clear in-app history and personal notification stream, without exposing database event names or allowing clients to forge system notifications.

## Product language

- user-facing: `Meldingen`, `Recente activiteit`, `Alles gelezen`
- internal: activity events / notification events
- technical names such as `event_type`, `payload`, trigger and category remain hidden

## Existing live foundation

Production already contains migration history `20260818110000_activity_notifications` with:
- `activity_events`
- richer `notifications` fields (`trip_id`, `event_type`, `entity_type`, `entity_id`, `payload`)
- `notification_preferences`
- server helpers for activity/notifications
- triggers for tasks, decisions, trip details, accepted invites and ready documents

Restore the missing migration source in GitHub.

## Security hardening

Current production still contains legacy notification policies that bypass the membership-aware policy:
- `Users can read own notifications`
- `Users can update own notifications`

Remove them with a new forward migration.

Normal clients no longer need to create arbitrary notification rows. Remove the authenticated INSERT policy and revoke client INSERT on `notifications`; server-side trigger helpers remain responsible for product event notifications.

Keep:
- own + current trip membership SELECT
- own + current trip membership UPDATE for read state
- activity SELECT only for trip members/internal admin
- notification preferences only for the owning user

## Product events

Start with meaningful events only:
- task created/assigned/completed
- decision created/closed
- trip basics changed
- invite accepted / member joined
- document ready

Do not notify for every row edit.

## UI

### Meldingen
Modernize the header notification center:
- use the generic event fields
- unread count
- mark one/all read
- show trip context when useful
- navigate to the relevant generic trip area where possible
- no full-profile directory fetch just to render sender names

### Recente activiteit
Trip Home shows a short, read-only recent activity block for the current trip.
Activity is not an admin audit trail and must use user-friendly messages.

### Preferences
Profile may expose simple in-app categories already backed by `notification_preferences`:
- Taaktoewijzingen
- Keuzes
- Reiswijzigingen

## Acceptance

- user can read/update only own notifications for trips they still belong to
- former/non-member cannot use legacy policy bypass
- authenticated client cannot forge arbitrary notification INSERTs
- trip member can read current trip activity; outsider sees none
- meaningful trigger event creates activity/notification as designed in rollback tests
- typecheck, Edge Function checks, lint, tests, production build pass
