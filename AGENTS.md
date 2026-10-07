# Vakansie engineering contract

These rules are authoritative for all code changes in this repository.

## Before editing

Read this file, `docs/VAKANSIE_MASTERPLAN.md`, the relevant existing code, relevant Supabase migrations, and the current generated Supabase types.

Do not assume that a feature described in old code is still a product requirement.

For new product work, `docs/VAKANSIE_MASTERPLAN.md` is the executable product and architecture roadmap. Keep each build bounded to the build definition and acceptance criteria rather than attempting an uncontrolled rewrite.

## Product boundary

Vakansie is a commercial vacation-preparation product from booking/decision through departure.

The signed-in product is organized around Home, Reis and Samen. Hansie is contextual throughout the trip and must not become a redundant primary navigation page.

The product must support solo travelers and groups, any destination, any vacation type and multiple trips per account.

Do not expand the current product into a travel diary, social feed, post-trip photo product, Google Maps replacement or OTA unless explicitly requested.

## Brand, work names and customer language

Keep four naming layers separate:
1. brand names
2. customer-facing product language
3. internal work names
4. technical/code/database names

A work name or technical name is never automatically valid frontend copy.

Before implementing a new user-facing concept, define its domain concept, technical name, internal work name and intended customer-facing label.

Do not expose names such as `trip_items`, `decision_options`, `readiness engine`, `context assembler`, `platform ops` or similar implementation language to customers unless an explicit product-copy decision says to do so.

`Vakansie` and `Hansie` are current brand candidates. Do not unnecessarily namespace generic technical entities with those brand names, so a future brand decision does not require architectural renaming.

## Legacy

The repository contains legacy code for a specific Malaga/Costa del Sol golf trip.

Never copy Malaga, Costa del Sol, golf, fixed people, fixed dates, fixed group sizes, fixed flights or fixed accommodation assumptions into new generic product code.

Do not spend time making deeply trip-specific legacy components generic unless a build instruction explicitly asks for it. Build the generic replacement first, verify it, then retire legacy code.

## Database

Never modify an already-applied Supabase migration. Create a new forward migration for every schema or RLS change.

Every trip-owned row must have a trip_id or derive its trip through a protected parent.

Never use display_name, username or email as a foreign key or authorization identity. Use UUID identity.

Prefer the relationship auth user id -> trip_members -> trip-owned data.

Keep generated Supabase TypeScript types synchronized after schema changes.

## RLS

RLS is mandatory for every user-owned or trip-owned table.

SELECT access to private trip data requires trip membership. Organizer-only operations require organizer membership in that trip.

Do not use UI checks or client-side filtering as authorization.

Do not leave broad policies such as USING (true) on private trip data.

trip_members must not have a generic authenticated INSERT policy. Joining must use the approved server-side join-by-invite RPC and the caller must never choose its own role.

Trip creation and creation of the organizer membership must be atomic.

## Service role

SUPABASE_SERVICE_ROLE_KEY bypasses RLS.

Any edge function using it must:
1. validate the access token
2. identify the authenticated user
3. verify permission for the requested trip
4. only then perform service-role reads

Never accept a tripId from the client and immediately query it with service role.

## Storage

Travel documents, tickets, vouchers and booking confirmations are private.

Never create public storage for sensitive trip files. Use authorized retrieval and signed URLs where appropriate.

## Auth and membership

Do not introduce hardcoded username/email maps as the permanent product authorization model.

Do not derive relational identity from display names.

Auth flows must support normal signup, normal login, an existing-user invite, a logged-out invite followed by signup/login, and multiple trips per account.

A temporary pre-launch allowlist may restrict access during development, but it must remain replaceable by normal product authentication and must not redefine the multi-user business model.

A user may be organizer in one trip and member in another. Global app admin is for internal Vakansie operations, not normal trip ownership.

## Routing

The tripId in the URL is authoritative for an opened trip.

Preferred routes:
- /trips
- /new-trip
- /trip/:tripId
- /trip/:tripId/reis
- /trip/:tripId/samen
- /join/:inviteCode

Do not make localStorage the authoritative source of trip identity. It may remember the last active trip only as a convenience.

## Generic travel model

Prefer one generic trip_items model for flights, trains, ferries, stays, rental cars, transfers, activities, restaurants, events, tickets and custom items.

Use generic fields plus metadata/json for type-specific details. Do not add destination-specific columns to the core model.

Golf is an activity. Accommodation comparison is a generic decision use case, not a special product architecture.

## Hansie

Hansie is a vacation-preparation assistant, not primarily a destination chatbot.

Hansie may use authorized current-trip facts such as dates, members, trip items, tasks, decisions, relevant expense state and document metadata.

Hansie must distinguish stored facts from suggestions and must never invent a booking. Live flight status, weather, prices or opening hours require an actual live source.

Hansie should initially be read-only and must not silently modify bookings, payments, members or documents.

## Code changes

Keep each requested build bounded.

Do not redesign unrelated pages while implementing backend or security work.

Do not add extra features because they seem useful.

Do not duplicate data concepts.

Reuse stable UI primitives and infrastructure where useful, but prefer clean generic structures over adding more conditions to legacy Malaga code.

Mobile is the primary UX target. Desktop must remain functional.

Do not change unrelated branding, colors, logos or visual details during backend/security work.

## Quality gate

Before completion run, where available:
- npm run build
- npm run lint
- npm run typecheck
- npm test

For relevant user flows, use browser testing where available and inspect console/network behavior.

Report changed files, migrations created, tests executed, failures and remaining risks.

Never report a build as done while known acceptance criteria fail.
## Platform admin user management

Account creation, invites, blocking and recovery mails go through the `ops-admin-users` Edge Function, which validates the token and the `user_roles` admin row before any service-role call; Pro grants, admin roles and admin trip membership go through `ops_*` security-definer RPCs that log to `admin_audit_log`. Why: auth admin APIs need the service role and must never be reachable from UI checks alone.
