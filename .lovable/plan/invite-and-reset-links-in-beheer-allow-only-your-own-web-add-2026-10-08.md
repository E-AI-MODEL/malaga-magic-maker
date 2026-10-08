# Invite and reset links in Beheer: allow only your own web addresses

## About your prompt
The prompt is good, but it offers a choice ("give 400, **or** leave it out"). That is not specific enough. Pick one option:
- **Give a 400 error (recommended).** Beheer always builds the link from the address of the page you are on, so a normal invite or reset never hits this error. An address that is not allowed is refused outright and does not change silently.

## About passwords (checked)
- When Beheer creates an account with a password, the password must be 10 to 72 characters. The server checks this before the account is created.
- In Beheer, a reset sends the user a link by email. You never see their password and you can't set a new one for them.
- The weak spot is the link in that email. Right now it can point to any https address. This plan fixes that.

## Steps
1. For invites and password resets, Beheer accepts only a link that returns to vakansie.app, www.vakansie.app, hansie.lovable.app or the preview. These are the same addresses as the payment check. Any other link gets the error "Ongeldige redirect". If no link is given, the email uses the default address.
2. Add tests: an allowed address passes; another site, http, and a different port are refused.
3. Publish the Beheer function again, then run the security scan again and close the three findings.

## Not in this plan
- No other changes.

## Technical details
- `supabase/functions/ops-admin-users/index.ts`: replace the `^https://` regex with `isAllowedReturnUrl(body.redirectTo, parseAllowedOrigins(Deno.env.get("ALLOWED_APP_ORIGINS")))` from `_shared/url-guards.ts`. A value that is present but not allowed returns 400 `invalid_redirect`.
- Tests: extend `src/test/security-guards.test.ts` with the reset URLs that `src/features/ops/data.ts` sends (`/reset-password`).
- Deploy `ops-admin-users`, run `security--run_security_scan`, and mark the 3 redirect findings as fixed.
