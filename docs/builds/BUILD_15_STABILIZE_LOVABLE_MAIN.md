# BUILD 15 — Stabilize Lovable direct-main snapshot

## Why this build exists

The last controlled product build was BUILD 14, merged through PR #15 at commit `bfdd5d35d5509dbb89e5e88b934f187c3b9467db`.

After that merge, the production Lovable project created a sequence of direct commits on GitHub `main`. The current snapshot is `372232bb1ebf976b84d4d38b640303f5535b85dd`, fourteen commits ahead of the BUILD 14 merge base.

Those commits include consumer UI changes as well as auth/security code and migration `20260818113051_879132e6-b9ff-459d-89a1-b51277f59275.sql`. A read-only production database inspection confirmed that the migration's policies/function/trigger are already present live. Therefore this build must not blindly reset `main` to BUILD 14.

## Goal

Certify or correct the current production snapshot through the normal GitHub delivery gates before any further product/design promotion.

This branch intentionally starts from the current `main`. The only production-neutral changes in this PR are audit documentation; the PR workflows therefore test the full current source snapshot while avoiding additional production behavior changes.

## Required review

Review the full delta from BUILD 14 merge `bfdd5d35d5509dbb89e5e88b934f187c3b9467db` to current snapshot `372232bb1ebf976b84d4d38b640303f5535b85dd`, with extra attention to:

- `src/lib/auth.tsx`
- `src/config/access.ts`
- `src/integrations/supabase/types.ts`
- `src/features/notifications/NotificationPreferences.tsx`
- `src/pages/Trips.tsx`
- `src/pages/TripHome.tsx`
- `src/components/HansieWidget.tsx`
- `supabase/migrations/20260818113051_879132e6-b9ff-459d-89a1-b51277f59275.sql`

## Audit results — 2026-08-18

- GitHub `main` and the production Lovable source were both verified at `372232bb1ebf976b84d4d38b640303f5535b85dd` before this certification branch was created.
- The separate `Vakansie Reisdossier` Lovable project is confirmed as design-only. Its V2 Travel OS run completed successfully and V1 remains preserved; it is not a production source.
- Production Lovable and design-prototype project knowledge now explicitly enforce the separation and the GitHub-first delivery contract.
- The production database was checked read-only. `block_non_hans_auth_user` is still present on `auth.users`, so the Hans-only pre-launch database gate remains active.
- `src/config/access.ts` remains restricted by default. Public signup is disabled while pre-launch access is restricted; invite signup requires an explicit invite-signup mode.
- `src/pages/Signup.tsx` checks those access flags before calling `signUp` and renders the private-build state when signup is disabled.
- `src/lib/auth.tsx` still enforces the Hans id/email allowlist on active sessions and password sign-in while restricted mode is active.
- The new migration is predominantly security hardening: it removes anonymous task-attachment read, narrows `app_settings`, tightens `SECURITY DEFINER` grants, adds controlled invite-code regeneration and rotates invite codes after member removal.
- The `app_settings` change is compatible with the remaining legacy deadline reader: `useDeadline` reads only `intake_deadline`, for which authenticated read is retained.
- The migration's new policies/function/trigger were confirmed present in the live production database, so a blind code rollback to BUILD 14 would be unsafe.
- No evidence was found that the design-only V1/V2 prototype was promoted into production.

## Required gates

- runtime dependency audit
- dependency audit
- TypeScript
- Deno Edge Function checks
- lint
- tests
- production build
- security review of auth/RLS/function grants and invite-code rotation
- read-only verification that GitHub `main`, production Lovable source and live database expectations agree

The first certification run passed runtime dependency audit, dependency audit, TypeScript, Deno Edge Function checks, lint, tests and production build. This documentation update must receive the same green PR gates before merge.

## Delivery rule from now on

Production changes follow:

`GitHub main -> named vakansie/* branch -> PR -> required gates -> merge -> verify Lovable sync -> deploy/smoke`

The production Lovable project must not create direct source commits on `main` during design consultation, planning, read-only inspection, deployment or smoke testing. The separate Vakansie Reisdossier Lovable project remains design-only; selecting a V1/V2 direction does not authorize direct production synchronization.

## Exit criteria

BUILD 15 is complete only when:

1. all required automated gates are green;
2. the fourteen-commit post-BUILD-14 delta has been reviewed, especially auth/security/migration changes;
3. any defects are fixed on this branch through reviewed commits;
4. production Lovable and GitHub source are synchronized to the approved result;
5. no blind rollback leaves the already-live database schema/policies ahead of application code.
