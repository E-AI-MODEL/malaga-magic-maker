# BUILD 09 - Platform operations

## Goal

Give the internal platform administrator a separate, audited management surface without weakening normal trip RLS or confusing platform administration with trip ownership.

## Naming

- internal technical route: `/ops`
- internal work name: platform ops
- visible admin label: `Beheer`
- do not show `superuser`, service-role, RLS, RPC or database terminology in the interface

## Security model

Frontend `isAdmin` checks are presentation only.
Every privileged read/write uses server-side `SECURITY DEFINER` RPCs that first require the authenticated user to hold the global internal `admin` app role.

Normal trip organizers do not gain platform access.
No service-role key is exposed to the browser.

## Existing live foundation

Production already contains migration history `20260818100000_platform_ops`, an `admin_audit_log` table and these protected functions:
- `ops_get_system_summary`
- `ops_search_users`
- `ops_get_user_overview`
- `ops_search_trips`
- `ops_get_trip_overview`
- `ops_set_trip_status`
- `ops_revoke_trip_invite`

Restore the missing migration source in GitHub. Later production-hardening migrations may replace individual function definitions; do not move later dependencies backwards into this historical migration.

## UI scope

`/ops` provides:
- compact system counts
- user search with account/trip summary
- trip search with preparation counts
- detail drawer/panel for a selected user or trip
- controlled trip status change

Destructive/support operations not backed by an audited server primitive are not faked in the frontend.

## Entry point

Only platform admins see `Beheer` from Profile. The route also has an admin presentation guard, but server authorization remains authoritative.

## Audit

Every privileged mutation exposed in this build must be written to `admin_audit_log` by the database function.
Platform admins may read the audit log; ordinary authenticated users may not.

## Acceptance

- platform admin system summary succeeds
- non-admin identity receives `42501`
- platform admin user/trip search succeeds
- trip status mutation writes an audit row (tested in rollback)
- customer trip RLS is unchanged
- typecheck, Edge Function checks, lint, tests and production build pass
