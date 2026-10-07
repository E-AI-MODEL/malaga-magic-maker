# Fix: dependency check blocks the build

## What is going on
The message is correct. The automatic check on GitHub stops on every "critical" issue. It finds 2 critical issues, both in the testing tool (vitest and its helper tinypool). That tool only runs during development and tests. It is never part of the live app, so visitors are not at risk. The check still blocks until the tool is updated.

The 19 "high" issues are also in build and dev tools (vite, tailwind, eslint). They do not block the check.

## Steps
1. Update vitest to 4.x (this also updates tinypool and @vitest/mocker). This clears both critical issues.
2. Do small, safe updates that fix issues in the live app: react-router-dom (open redirect fix) and typescript-eslint.
3. Fix the test setup if vitest 4 needs any config changes.
4. Run typecheck, lint, all tests and the production build, then run the dependency check again with the same script. The result must show `critical=0`.

## Not in this plan
- Moving vite 5 to 8 or tailwind 3 to 4. These are large upgrades that could change the look of the app. They need their own step later, and these issues do not block the check.
- No changes to the app's features, look or data.

## Technical details
- Files: `package.json`, the lockfile, and possibly `vitest.config.ts` and the test setup.
- `scripts/audit-summary.mjs` only fails on critical; this stays the same.
