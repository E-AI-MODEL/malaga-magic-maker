# BUILD 15 - Business product redesign

## Why

The product is functionally sound but the signed-in experience still reads as a generic CRUD dashboard. Mobile screenshots from production show oversized empty-state cards, repetitive metric grids, weak navigation hierarchy and an operations screen that behaves like a database browser rather than a platform console.

Hansie also disappears on account-level pages because it is mounted inside the trip layout and refuses to render without an active trip. That is a product-shell regression: the assistant is part of Vakansie, not a decorative widget on a subset of routes.

## Goal

Make the signed-in product feel like a coherent, commercially credible travel-preparation workspace without changing the existing authorization model or inventing new business domains.

## Product shell

- Hansie is mounted once at the signed-in application level.
- On a trip route Hansie automatically uses that trip as context.
- On account-level routes Hansie uses a selectable trip from the user's existing memberships.
- Switching Hansie trip context clears the visible conversation so context cannot bleed between trips.
- No global/non-trip AI backend is introduced; every Hansie request remains explicitly trip-scoped and membership-authorized.
- Trip navigation remains Overzicht / Reis / Samen, but its presentation must feel like a product dock/rail rather than three equal template tabs.

## Mijn reizen

- Remove the oversized marketing-style empty-state panel.
- Use a compact command header with a clear Nieuwe reis action.
- Show active and previous trips as information-dense rows, not a card grid.
- When there is no active trip, use a compact action banner and still make existing archived trips immediately useful.
- Keep destination, timing, dates and group size readable without opening the trip.
- Keep archive secondary without hiding all useful content below a large empty state.

## Profiel

- Treat Profiel as account settings rather than a loose collection of cards.
- Separate identity, account data, notification preferences and internal access.
- Use proper switch-like notification controls and compact rows.
- Show the platform-admin entry as part of account access, not as an isolated promotional card.
- Keep active trip references concise and secondary.

## Beheer

Turn `/ops` into a platform console.

- Replace the 2x4 identical metric-card grid with a compact operational header and metric strip.
- Put system health first: recent browser errors and Hansie usage are visible without navigating to a second screen.
- Provide first-class console sections for Overzicht, Gebruikers, Reizen and Logboek, with a clear path to Fouten.
- Use dense result rows and detail panels instead of repeating large cards.
- Make the overview actionable: surface active trips, open work, invitations and health signals.
- Preserve current platform-admin authorization and existing RPC/data contracts.
- Trip status changes remain explicit and auditable.

## Non-goals

- no pricing or billing
- no new auth/RLS model
- no weakening of the post-BUILD 14 security hardening
- no new AI backend or account-wide prompt context
- no social feed or chat product
- no new database schema unless a concrete blocker is proven
- no destination search/content integration

## Acceptance

- Hansie is reachable from `/trips`, `/profiel` and all trip pages for a user with at least one accessible trip.
- Every Hansie request still contains a concrete trip id.
- Changing account-level Hansie context resets the visible conversation.
- `/trips` no longer renders the previous full-width giant empty-state card.
- `/profiel` presents account and notification settings as a coherent settings surface.
- `/ops` no longer opens with eight equal statistic cards.
- `/ops` shows Hansie requests and browser errors from the existing ops summary.
- Existing user/trip search, user detail, trip detail, audit data and trip-status mutation remain available.
- no Malaga/golf/fixed-person assumptions are introduced.
- mobile-first visual review at roughly 390px width is required before merge.
- typecheck, Edge Function checks, lint, tests, production build and runtime dependency audit must pass before merge.
