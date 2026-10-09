# Vakansie product & architecture masterplan

Status: authoritative product plan for new work

This document turns the current product direction into an executable frontend-to-backend roadmap. It is subordinate only to explicit later product decisions and security requirements. When legacy Malaga code conflicts with this plan, the generic Vakansie product wins.

## 1. Product thesis

Vakansie is a mobile-first vacation preparation product that helps a solo traveler or group organize a trip from the moment a trip starts taking shape until departure.

The core user problem is fragmentation: bookings, confirmations, notes, documents, tasks, decisions, expenses and group communication live in different apps and channels. Vakansie provides one trusted preparation workspace per trip.

The product must answer four practical questions:

1. What is already arranged?
2. What is still missing?
3. Who needs to do or decide what?
4. Are we ready to leave?

Hansie is the contextual assistant that understands the authorized current-trip facts and helps users interpret them. Hansie is not the database, not the source of truth and not primarily a destination chatbot.

### Product boundary

In scope:
- solo travelers and groups
- multiple trips per account
- any destination and vacation type
- trip creation, membership and invitations
- chronological travel and booking information
- tasks and responsibilities
- group decisions
- expenses and splits
- private travel documents
- notifications and activity
- readiness / missing-items logic
- contextual Hansie assistance
- internal platform operations for the Vakansie superuser

Out of scope unless explicitly added later:
- OTA / booking marketplace
- full maps replacement
- public social network
- travel diary or post-trip photo product
- automatic financial transactions
- autonomous AI changes to bookings, members, payments or documents

## 2. Naming architecture: brand != product copy != work names != code

Every feature must separate four naming layers.

### 2.1 Brand layer

What the customer recognizes and remembers.

Current brand candidate: **Vakansie**.

Vakansie is treated as a strong working brand, not as a technical namespace. A future rebrand must not require renaming the database or application architecture.

Current assistant brand candidate: **Hansie**.

Hansie may become a final customer-facing name, but technical components should use neutral names such as `assistant`, `ai_context`, or `trip_ai` where appropriate.

### 2.2 Product-language layer

Words a normal traveler should understand without knowing our architecture.

Examples:
- Home
- Nieuwe reis
- Reis
- Medereizigers
- Nog regelen
- Kosten
- Documenten
- Vraag Hansie

These labels are chosen for comprehension and may change after UX testing.

### 2.3 Internal work-name layer

Language used by the team to reason about the product.

Examples:
- Trip Home
- Together / Samen domain
- readiness engine
- decision engine
- context assembler
- platform ops

A work name is never automatically frontend copy.

### 2.4 Technical layer

Names used in code, database and APIs.

Examples:
- `trip_items`
- `trip_members`
- `decision_options`
- `expense_splits`
- `readiness_checks`
- `/ops`

Technical names must not leak into customer-facing copy unless explicitly approved.

### 2.5 Naming rule for every feature

Before implementation, define:

1. domain concept
2. technical name
3. internal work name
4. customer-facing label

Example:

| Layer | Value |
|---|---|
| Domain concept | work that must happen before departure |
| Technical name | `tasks` |
| Work name | task management |
| Customer copy | Taken or Nog regelen, depending on context |

Current customer labels (technical contracts remain unchanged):

| Route / technical concept | Customer label |
|---|---|
| `/trips` | Home |
| `/trip/:tripId` | Overzicht |
| `/trip/:tripId/reis` | Reis |
| `/trip/:tripId/samen` | Samen |
| `tasks` | Taken |
| `decisions` | Keuzes |
| `expenses` | Kosten; Knaakie for settlement |
| `/profiel` | Profiel |
| `/ops`, `/ops/errors` | Beheer |

Signed-in entry opens Home, with pending invitations and explicit next destinations taking precedence.

## 3. Roles and authorization model

Three concepts must remain separate.

### 3.1 Platform superuser

An internal Vakansie operations role. Initially Hans owns this role.

Capabilities are server-side only and fully audited. The browser never receives a service-role key.

Examples:
- find users and trips
- inspect memberships and system status
- revoke problematic invites
- block or disable an account
- archive a trip
- investigate AI and function failures
- inspect audit events

### 3.2 Trip organizer

A role scoped to one trip.

A user may be organizer on one trip and member on another.

Organizer capabilities may include:
- edit trip basics
- invite and remove members
- manage member roles within allowed policy
- create and manage shared tasks
- open and close decisions
- archive a trip

### 3.3 Trip member

A participant in a trip.

Members can only access data for trips where an active membership exists and can perform only the actions allowed by RLS and domain policy.

### Authorization identity

UUID is the only relational identity.

Never use display name, username or email as a foreign key or authorization identity.

## 4. Authentication lifecycle

The current Hans-only login is a pre-launch access gate, not the final customer architecture.

### Production auth must support
- email/password signup
- login
- email verification as chosen for launch
- forgot/reset password
- account/session revocation
- account deletion/export flows
- existing-user invite acceptance
- logged-out invite -> signup/login -> membership

### Pre-launch rule

Development may temporarily restrict access to an allowlist, but this must be implemented as a removable environment/configuration policy, not permanent hardcoded product logic.

Target concept:

`PRELAUNCH_ACCESS_MODE=true`

When disabled, normal product authentication can launch without rewriting auth.

## 5. Information architecture

### Account level

Primary route:
- `/trips`

Purpose:
- show upcoming, past and archived trips
- show pending invitations
- create a trip
- reopen recent trips
- access account profile

No specific trip may behave as "the app".

### Trip level

Authoritative trip identity comes from the URL.

Preferred routes:
- `/trip/:tripId`
- `/trip/:tripId/reis`
- `/trip/:tripId/samen`

Convenience state may remember a recent trip, but localStorage is never authoritative.

### Primary trip navigation architecture

Internal information architecture:
- Home
- Reis
- Samen

The final visible labels are product-copy decisions. The architecture may remain Home/Reis/Samen even if UX research later changes a tab label.

Hansie is contextual throughout and must not become a redundant primary navigation destination.

## 6. Trip Home domain

Purpose: answer "How is this trip going and what matters now?"

The page should be a calm preparation cockpit, not a giant task list and not a chart dashboard.

Core modules:
- trip identity: destination/name, dates, countdown
- readiness summary
- highest-priority unresolved items
- next chronological travel item
- short collaboration status
- contextual Hansie entry point

Potential customer copy:
- Nog 43 dagen
- Bijna klaar voor vertrek
- Nog 3 dingen regelen

Avoid exposing internal phrases such as "readiness engine".

## 7. Reis domain: generic chronological trip model

Introduce a generic `trip_items` model as the long-term source for itinerary and booking facts.

Supported item types should be extensible, for example:
- flight
- train
- ferry
- stay
- rental_car
- transfer
- activity
- restaurant
- event
- ticket
- custom

Golf is an `activity`. Accommodation is a `stay`. These are not core architectural special cases.

### Proposed `trip_items`

Core fields:
- `id uuid`
- `trip_id uuid`
- `type text/enum`
- `title text`
- `status text`
- `start_at timestamptz`
- `end_at timestamptz`
- `timezone text`
- `location_name text`
- `address text`
- `latitude numeric`
- `longitude numeric`
- `provider text`
- `booking_reference text`
- `booking_url text`
- `price numeric`
- `currency text`
- `notes text`
- `metadata jsonb`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

Type-specific details belong in validated metadata rather than destination-specific core columns.

### Reis UX

Present a human chronological timeline rather than database categories.

Example:
- 08:40, flight Amsterdam -> Florence
- 12:30, rental car pickup
- 15:00, villa check-in
- next day, wine tasting

## 8. Samen domain

Samen is the internal collaboration domain. The final tab label remains a product-copy decision.

### 8.1 People
- memberships
- organizer/member roles
- invite status
- invite/revoke/remove flows

### 8.2 Tasks
Tasks must use UUID assignments.

Target concepts:
- owner/assignee
- due date
- status
- priority where useful
- optional relation to `trip_item`

Legacy text fields such as `assigned_to = 'Robin'` must not survive as the relational model.

### 8.3 Generic decisions

Replace the Malaga-specific intake/accommodation-result architecture with a generic decision model.

Proposed entities:
- `decisions`
- `decision_options`
- `decision_votes`

Examples:
- Which accommodation do we choose?
- Rental car or train?
- Which activity do we book?

Accommodation comparison is one decision use case, not a special application architecture.

### 8.4 Expenses

Use normalized expense splits.

Proposed entities:
- `expenses`
- `expense_splits`

Never store participant names as the relational settlement model.

## 9. Documents

Travel documents are private first-class trip data.

Proposed `trip_documents` fields:
- `id uuid`
- `trip_id uuid`
- `trip_item_id uuid null`
- `uploaded_by uuid`
- `filename text`
- `mime_type text`
- `storage_path text`
- `document_type text`
- `created_at timestamptz`

Storage requirements:
- private bucket
- membership-authorized retrieval
- signed URLs where appropriate
- no public booking confirmation or ticket URLs

Initial Hansie behavior should rely on document metadata unless an explicit secure extraction feature is built.

## 10. Hansie architecture

Hansie is a vacation-preparation assistant.

### Mandatory request order
1. validate access token
2. identify user
3. verify trip permission
4. assemble only authorized trip context
5. call model / tools

Any edge function using service-role access must follow that sequence before private reads.

### Context sources
Potential authorized facts:
- trip basics
- members
- trip items
- tasks
- decisions
- relevant expense summary
- document metadata
- readiness result

### Facts vs suggestions
Hansie must clearly distinguish stored facts from suggestions.

Never invent a booking or live state.

Live flight status, weather, opening hours and prices require an actual live source.

### Read-only first
Hansie initially reads and explains.

Future writes require explicit confirmation, for example:
"Zal ik hier een taak van maken?"

Never silently modify members, payments, bookings or documents.

## 11. Readiness engine

Readiness is a deterministic product capability, not an AI score.

Possible checks:
- trip dates present
- required transport/stay state
- open tasks
- open decisions
- missing required document metadata
- pending invitations

The engine returns structured facts/status. Hansie may interpret the result in natural language.

Customer-facing output should favor useful language such as:
- Nog 3 dingen regelen
- Bijna klaar voor vertrek

Avoid false precision unless a percentage has proven UX value.

## 12. Notifications and activity

### User notifications
Focus on meaningful events:
- invitation received
- task assigned
- decision opened/closed
- relevant trip change
- document added
- expense added where relevant

Start in-app. Email/push can follow with preferences.

### Activity events
A user-facing per-trip history, for example:
- Hans added a stay
- Pieter accepted the invite
- Marleen voted on an option

### Admin audit log
Separate from user activity.

Every privileged platform operation must record:
- actor
- action
- target type/id
- relevant metadata
- timestamp

## 13. Platform Ops

Internal route family, working name `/ops`.

"Ops" and "superuser" are internal terms. Customer-facing/internal admin UI can simply say Beheer where clearer.

Target capabilities:
- users
- trips
- memberships
- invites
- security/system status
- AI/function diagnostics
- audit trail

Privileged operations must use authenticated server functions and explicit platform-role verification.

## 14. Target data model

Conceptual target:

```text
auth.users
  -> profiles
  -> platform_roles
  -> trip_members -> trips
                    -> trip_items -> trip_documents
                    -> tasks
                    -> decisions -> decision_options -> decision_votes
                    -> expenses -> expense_splits
                    -> trip_invites
                    -> notifications
                    -> activity_events
                    -> ai_conversations / usage metadata as needed
```

Not all entities must ship at once. This is the direction that prevents new legacy special cases.

## 15. RLS and security model

Every private trip-owned row must resolve to a trip and be protected by membership.

Preferred authorization relationship:

`auth.uid() -> trip_members -> trip-owned row`

Rules:
- SELECT private trip data: membership required
- organizer-only operation: organizer membership required
- no broad authenticated INSERT for `trip_members`
- join via approved server-side/RPC invite flow
- caller never chooses its own role
- trip creation + organizer membership atomic
- no `USING (true)` on private data
- no service-role credential in browser
- platform superuser does not receive a browser RLS bypass

## 16. Invitations

Move from permanent simple trip invite codes toward revocable invitation records.

Proposed `trip_invites`:
- `id`
- `trip_id`
- `token_hash`
- `created_by`
- `role`
- `expires_at`
- `max_uses`
- `uses`
- `revoked_at`
- `created_at`

This allows revocation, expiry and usage tracking without exposing durable secrets in the database or UI.

## 17. Frontend architecture

Prefer domain features over giant page files.

Target shape:

```text
src/
  app/
  components/
  features/
    auth/
    trips/
    travel/
    collaboration/
    decisions/
    expenses/
    documents/
    hansie/
    notifications/
    ops/
```

Each feature may own:
- components
- queries
- mutations
- types
- validators
- utilities

React Query should own server state.

Trip-scoped query keys include `tripId`.

## 18. Target route architecture

```text
/login
/signup
/forgot-password

/trips
/new-trip
/join/:token

/trip/:tripId
/trip/:tripId/reis
/trip/:tripId/samen

/profile

/ops
/ops/users
/ops/trips
/ops/system
```

The final frontend labels can change without changing these technical routes.

## 19. Legacy Malaga migration strategy

Do not keep making deep Malaga components more generic.

Build generic replacements first, verify them, migrate useful data, then retire legacy routes and tables.

Treat the current Malaga trip as legacy/test data rather than the application itself.

Possible migration examples:
- `travel_legs` -> `trip_items`
- useful accommodation record -> `trip_items(type=stay)` where it represents a real selected/booking fact
- legacy tasks -> normalized tasks
- legacy expenses -> expenses + normalized splits

Do not migrate prototype-specific assumptions simply because data exists:
- golf preference fields
- fixed group logic
- Malaga destination assumptions
- accommodation elimination game architecture
- participant-name arrays as relational state

Retirement sequence:
1. generic replacement exists
2. parity/acceptance tests pass
3. useful data migrated
4. legacy routes removed from navigation
5. legacy tables become read-only if needed for transition
6. export/back-up
7. remove obsolete schema only in a later explicit migration

## 20. Business model readiness

The product is commercial, but pricing is not yet sufficiently defined in the source material.

Do not hardcode an unvalidated monetization model into trips or membership.

Design future monetization as a separate entitlement layer, for example:
- subscriptions
- entitlements
- usage limits

Open business decisions:
- who pays: organizer, account, group or per-trip
- subscription vs per-trip vs freemium
- AI usage limits
- B2C only or later partnerships/B2B2C

These require explicit product decisions before billing architecture is implemented.

## 21. Privacy, retention and user control

Production planning must include:
- account deletion
- trip deletion/archive semantics
- data export
- document retention
- AI data handling disclosure
- audit retention
- least-privilege service access

Exact legal copy and retention periods are policy decisions and must not be invented by engineers.

## 22. Observability

Production must distinguish:
- application errors
- auth/RLS failures
- edge function failures
- AI provider failures
- slow queries/functions
- invitation abuse
- platform admin actions

No secrets or full private documents in logs.

## 23. Product analytics

Measure progress toward user value, not only pageviews.

Useful events:
- account created
- trip created
- first trip item added
- invite sent
- invite accepted
- first task completed
- decision completed
- document added
- Hansie used
- trip reaches defined ready state

Potential product health metrics:
- time from trip creation to first useful travel item
- invite acceptance rate
- percentage of trips with resolved preparation items before departure
- repeated trip creation by returning users

Analytics must respect privacy and consent requirements.

## 24. Build roadmap

Each build is bounded, has its own branch, migrations where needed, tests and acceptance criteria. No build is merged merely because the UI looks plausible.

### BUILD 02 - Product shell
Goal: stop presenting the Malaga prototype as the product.

Deliver:
- account-level `/trips`
- URL-authoritative `/trip/:tripId`
- new trip shell with Home/Reis/Samen architecture
- contextual Hansie launcher, no primary Reisgids tab
- trip switch/back-to-trips UX
- legacy routes remain available only as transitional internals where needed
- no Malaga/fixed-person/fixed-date copy in new shell
- platform role foundation design, no unsafe browser superuser bypass

No deep data migration yet.

### BUILD 03 - Trip lifecycle
- generic create/edit/archive trip
- destination/date/timezone/currency basics
- multiple-trip account flow
- remove localStorage as authority
- prelaunch-access configuration foundation

### BUILD 04 - Reis timeline
- `trip_items`
- generic item create/edit/read
- timeline UX
- migration adapters for useful legacy travel/stay facts

### BUILD 05 - Samen
- normalized members UI
- tasks with UUID assignment
- generic decisions/options/votes
- normalized expense splits

### BUILD 06 - Production auth & invites
- remove permanent Hans-only auth architecture
- configurable prelaunch gate
- signup/login/recovery
- secure revocable invite records
- logged-out invite continuation flow

### BUILD 07 - Documents
- private document metadata/storage model
- signed access
- item linkage
- upload/read/delete authorization tests

### BUILD 08 - Hansie v1 product context
- generic context assembler
- authorized facts from new domains
- readiness integration
- facts-vs-suggestions behavior
- live-source contracts for unstable facts

### BUILD 09 - Platform Ops
- platform roles
- `/ops` shell
- server-side privileged operations
- admin audit log

### BUILD 10 - Notifications & activity
- event model
- in-app notifications
- user-facing trip activity
- preferences foundation

### BUILD 11 - Legacy retirement
- remove Malaga navigation/product routes
- migrate remaining useful data
- archive/export legacy-only state
- remove obsolete code after parity

### BUILD 12 - Production hardening
- E2E critical flows
- security/advisor review
- performance
- accessibility
- observability
- privacy/export/delete paths
- production launch checklist

## 25. Definition of done for every build

Where relevant, every build must report and pass:
- TypeScript typecheck
- lint
- unit/contract tests
- production build
- generated Supabase types synchronized after schema change
- migration verification
- RLS authorization tests
- mobile browser flow
- desktop smoke test
- console/network error review
- changed files
- migrations created
- remaining risks

Security builds additionally require cross-tenant tests:
- user A / trip A
- user B / trip B
- user B cannot read or mutate trip A
- organizer/member permission boundaries
- platform operations reject non-platform-admin users

## 26. Build acceptance rule

A build is not done while known acceptance criteria fail.

Do not solve failed acceptance by weakening authorization, hiding errors in the UI, or preserving a legacy special case in the new generic architecture.

## 27. Source-of-truth order

When instructions conflict, use this order:
1. explicit current user instruction
2. security/privacy requirements
3. `AGENTS.md`
4. this masterplan
5. current README/product documentation
6. legacy code and historical Lovable plans

Historical Malaga behavior is evidence of the old prototype, not proof of a current product requirement.
