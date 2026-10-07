# Vakansie engineering contract

Authoritative for all code changes. Before editing read this file, `docs/VAKANSIE_MASTERPLAN.md` (product roadmap), relevant code, migrations and generated types. Old code is not automatically a requirement. Keep each build bounded to its acceptance criteria.

## Product
- Generic vacation-preparation product (booking through departure) for solo and groups, any destination/type, multiple trips per account.
- Signed-in IA: Home, Reis, Samen. Hansie is contextual, never a primary nav page. No diary, social feed, photo product, maps replacement or OTA unless requested.
- Never copy legacy Malaga/golf/fixed people/dates/group/flight/accommodation assumptions into generic code. Build generic replacements first, then retire legacy.

## Naming
Keep brand, customer copy, internal work names and technical names separate. Never show technical/work names (`trip_items`, `readiness engine`, `platform ops`…) as customer copy. Don't namespace generic entities with brand names.

## Database and RLS
- Never modify an applied migration; always add a forward migration. Keep generated types in sync.
- Every trip-owned row has `trip_id` or a protected parent. UUID identity only; never display name/username/email as FK or authorization.
- RLS on every user/trip-owned table: SELECT needs membership, organizer ops need organizer membership. No `USING (true)` on private data; UI checks are never authorization.
- No generic INSERT on `trip_members`; joining only via invite RPC, caller never picks own role. Trip + organizer membership creation is atomic.

## Service role and storage
- Edge functions using the service role must validate the token, identify the user and verify permission for the requested trip (or platform admin) before any service-role call. Never query a client-supplied tripId directly with the service role.
- Travel documents are private storage with authorized retrieval / signed URLs.
- Platform admin user management uses the `ops-admin-users` function and `ops_*` RPCs (see that function's AGENTS.md). Why: auth admin APIs need the service role.

## Auth
Support signup, login, existing-user invite, logged-out invite then signup/login, multi-trip accounts. Pre-launch allowlists must stay replaceable. Per-trip organizer/member is separate from global platform admin. No hardcoded user maps.

## Routing
URL tripId is authoritative (`/trips`, `/new-trip`, `/trip/:tripId[/reis|/samen]`, `/join/:inviteCode`). localStorage may only remember the last trip.

## Travel model
One generic `trip_items` model; type-specific details in metadata, no destination-specific columns. Golf is an activity; accommodation comparison is a generic decision.

## Code changes
Bounded builds; no unrelated redesigns, extra features, duplicated concepts or branding changes during backend/security work. Mobile first, desktop functional.

## Quality gate
Run build, lint, typecheck and tests; browser-test relevant flows. Report changed files, migrations, tests, failures and risks. Never report done while acceptance criteria fail.
