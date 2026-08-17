# Apply PR #2 security migrations

## Goal
Fetch the three Supabase migrations from GitHub PR #2 / branch `vakansie/build-01-security` and apply them in order to the connected database. No merge to main, no UI or functionality changes.

## Steps
1. Connect GitHub sync to this Lovable project so branch `vakansie/build-01-security` becomes available.
2. Pull the three migration files into the workspace:
   - `20260816165000_vakansie_security_foundation.sql`
   - `20260816165100_vakansie_security_policy_hardening.sql`
   - `20260816165200_disable_public_task_attachment_uploads.sql`
3. Apply the migrations in that order using the Supabase migration tool.
4. Verify the results and report back whether all three succeeded, or return any database errors verbatim.

## Non-goals
- No merge to main.
- No changes to UI, functionality, or TypeScript types.
- No regenerating Supabase types (handled afterwards by the requester).
