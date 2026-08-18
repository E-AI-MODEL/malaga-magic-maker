# BUILD 12 - Production hardening

## Goal

Finish the current Vakansie roadmap with launch-quality hardening rather than more product scope.

## Existing live foundation

Production already contains migration history `20260818130000_production_hardening` with:
- `ai_usage_events`
- `client_error_events`
- protected `record_client_error(...)`
- platform-admin read access to client errors
- an enhanced `ops_get_system_summary()` with 24h Hansie/client-error counts

Restore the missing migration source in GitHub. Do not reapply the already-live migration.

## Observability

### Hansie
- record a minimal usage event only after token + membership authorization and a successful AI gateway response
- store only user id, trip id, feature and timestamp
- do not store prompts/responses in usage telemetry

### Client errors
- install a small authenticated reporter for uncaught browser errors and unhandled promise rejections
- send a short sanitized message and bounded non-sensitive context through `record_client_error`
- never send passwords, access tokens, full URLs with invite tokens, document contents or AI conversation text
- backend rate limit remains authoritative

### Beheer
- surface 24h Hansie request count and client-error count from the already-hardened ops summary
- provide a compact recent client-error view for platform admin only

## Privacy / security checks

- telemetry tables remain inaccessible to normal clients except through the protected error-reporting RPC
- client error reporting rejects a trip id the user cannot access
- Hansie telemetry cannot be written by normal browser clients
- no prompt or document content is persisted in telemetry
- legacy prototype routes remain retired
- prelaunch Hans-only gate remains explicitly temporary, not a permanent product architecture

## Dependency audit

Current CI install output reports 21 npm audit findings, including 1 critical.

This build must:
1. capture the actual vulnerable dependency/advisory set in CI
2. upgrade direct dependencies where safe and commit the resulting lockfile
3. avoid blind `--force` upgrades that cause major/breaking changes
4. rerun typecheck, tests and build after dependency changes
5. document any remaining audit findings with whether they are runtime or dev-only and a concrete follow-up if they cannot be safely resolved in this build

Launch is blocked by an unresolved critical runtime vulnerability.

## Accessibility / runtime quality

At minimum verify:
- main actions have labels/accessible names
- mobile bottom navigation does not obscure primary content
- keyboard focus works for dialog/sheet forms
- no new console/network errors in the core create-trip/open-trip/add-item flow where browser testing is available
- production bundle builds successfully

## Final acceptance

- typecheck
- Edge Function checks
- lint
- full tests
- production build
- production telemetry authorization rollback tests
- dependency audit captured and critical runtime issues resolved or explicitly block launch
- final Lovable publish from current `main`
- verify published project snapshot is based on the final merged commit
