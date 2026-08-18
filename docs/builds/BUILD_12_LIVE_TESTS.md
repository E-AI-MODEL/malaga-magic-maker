# BUILD 12 live authorization checks

The following checks were executed against the connected production database inside a transaction and rolled back.

## Client error reporting

- authenticated Hans may report a sanitized client error scoped to a trip he belongs to: PASS
- an authenticated outsider may not report an error against that trip: PASS (`record_client_error` returned false)
- direct authenticated INSERT into `ai_usage_events` is blocked: PASS
- a non-admin identity cannot read `client_error_events`: PASS

No test telemetry was persisted.

## Earlier launch-security checks still in force

The current production schema also has live rollback evidence from the preceding builds for:
- cross-trip RLS isolation
- private trip document storage and unreserved-upload rejection
- deterministic readiness member/outsider authorization
- platform-admin RPC authorization and audit logging
- notification membership revocation and client-notification forgery blocking
- trip activity visibility only to members

BUILD 12 does not weaken any of those boundaries.
