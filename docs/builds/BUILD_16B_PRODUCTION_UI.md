# BUILD 16B - Production consumer and admin UI

## Goal

Bring Reis, Samen, Profiel and Beheer to the approved calm premium light direction on top of the BUILD 16A shell:
warm ivory canvas, near-black/deep green ink, restrained teal, selected serif display moments, dense sans UI and
hairline rows instead of card grids. Beheer is visibly separate with a dark charcoal header.

## Scope

- `src/pages/TripReis.tsx`: compact intro, quiet Toevoegen, chronological day sections with hairline rows,
  `Nog niet ingepland` group, documents unchanged in function.
- `src/pages/TripSamen.tsx`: compact header, `Voor jou` above navigation, primary segmented control with only
  Taken / Keuzes / Kosten (default Taken), dense hairline rows, `Reizigers` as a secondary section.
- `src/pages/Profiel.tsx`: consumer settings surface with identity block, grouped hairline sections for account,
  meldingen, toegang, reizen and sessie (logout).
- `src/pages/Ops.tsx`, `src/pages/OpsErrors.tsx`, `src/features/ops/OpsShell.tsx`: dark charcoal admin header with one
  navigation pattern (Overzicht, Gebruikers, Reizen, Logboek, Fouten), dense operational rows.
- `src/index.css`, `src/components/primitives.tsx`, `src/components/BottomNav.tsx`: shared presentation cleanup.

## Non-goals

- no backend, schema, RLS, auth, storage or Edge Function changes
- no change to `trip-ai-chat` or the Hansie request/stale-stream contract
- no new data, no invented metrics, no fake content
- no destination-specific or fixed-group assumptions
- no publish or deploy from this reference remix

## Acceptance

- Reis keeps the BUILD 14 quick-add contract: `openCreate(value)` only preselects the existing TripItemSheet.
- Samen keeps every task, decision and expense query, mutation and sheet.
- Archived trips remain read-only on Reis and Samen.
- Beheer exposes all five destinations, sections deep-link via `/ops?section=<id>`, Fouten routes to `/ops/errors`, and only existing ops data is used.
- Trip navigation stays exactly Overzicht / Reis / Samen.
- typecheck, lint, the focused BUILD 14/16A/16B contract tests and the production build pass **inside this reference remix**.
- Remix-only caveat: several suites still fail here because the remix has no `supabase/migrations/` directory. That is an environment gap, not a code result.
- Full verification is therefore NOT complete until this diff is promoted to a branch on canonical GitHub `main` and the complete production CI/quality gate (including the migration and security suites) runs green there.