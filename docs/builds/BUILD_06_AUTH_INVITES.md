# BUILD 06 - Auth & secure invites

Status: implementation branch
Branch: `vakansie/build-06-auth-invites`

## Goal

Replace the hardcoded-Hans product architecture with production-ready account and invitation flows while preserving the current private pre-launch gate until an explicit launch decision opens registration.

## Important launch boundary

The product architecture must support normal users now, but the production environment must still remain Hans-only after this build unless the launch gate is explicitly activated.

Therefore:
- normal email/password signup, login, recovery and invite continuation are implemented
- secure trip invites are fully implemented
- `PRELAUNCH_ACCESS_RESTRICTED` remains on by default
- the live `block_non_hans_auth_user` trigger remains enabled
- signup UI is unavailable while pre-launch is restricted
- no new production auth users are created during this build

Opening public registration is an explicit deployment/configuration event, not an accidental side effect of merging product code.

## Account model

- Supabase Auth user UUID is identity
- `profiles` contains display information only
- global `user_roles.admin` is internal platform authority, not trip ownership
- `trip_members.role` is per-trip organizer/member authority
- email/display name never acts as a relational foreign key

## Account flows

When the launch gate is open, support:
- email/password signup
- email/password login
- password recovery
- recovery password update
- logged-in invite acceptance
- logged-out invite preview followed by login/signup and continuation

During pre-launch:
- only the existing Hans allowlisted account may authenticate through the app
- signup pages explain that access is not open yet; they must not call signup

## Secure invites

New tables:
- `trip_invites`
- `trip_invite_uses`

Raw invite token is returned only once by the create RPC and is never stored. Database stores only SHA-256 hash.

Invite fields:
- trip
- optional target email
- fixed member role in this build
- creator
- expiry
- maximum uses
- use count
- revocation

Use rows record which UUID accepted the invite and when.

## Invite RPCs

### `create_trip_invite`
Organizer/internal admin only.
Returns a new raw cryptographic token exactly once.
Caller cannot choose organizer role.

### `get_trip_invite_preview`
Callable with possession of the token, including logged-out users.
Returns only the minimal invitation context required for the join screen: trip name, destination, dates and whether login/signup may continue. It does not expose private trip data or member lists.

### `accept_trip_invite`
Authenticated only.
- validates hash, expiry, revocation, remaining uses and optional target email
- idempotent for an already accepted/current member
- inserts membership with hardcoded `member` role
- records use and increments counter atomically

### `revoke_trip_invite`
Organizer/internal admin only.

## RLS / grants

- organizers can read invite metadata for their own trip
- invite-use rows readable by trip organizer and the user represented by the row
- no direct client insert/update/delete on invite tables
- raw token never appears in SELECTable table data
- all write paths are RPCs

## Frontend

Routes:
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/join/:inviteToken`

Trip settings / Samen organizer UI:
- generate invite
- copy invitation link
- show active/revoked/expired invite metadata
- revoke invite

Customer-facing language uses `Uitnodiging`, `Meedoen`, `Account maken`, not internal terms such as token hash, membership RPC or prelaunch gate.

## Security tests

All DB tests use transaction rollback and must leave only Hans as the production auth user.

Required:
- outsider cannot create invite for trip
- member cannot create invite for trip
- organizer can create invite
- database stores only token hash, not raw token
- preview works with valid token and rejects revoked/expired token
- accept assigns only `member`
- accept is idempotent and does not double count
- target-email mismatch denied
- max use enforced
- revoked invite denied
- direct authenticated write to invite tables denied

If testing acceptance requires a second auth identity and the production auth owner boundary prevents a temporary user, do not weaken `auth.users`. Test all independent database controls and document the one unavailable full-flow test.

## Quality

- typecheck
- Edge Function checks
- lint
- tests
- production build
- no public registration activation

## Merge rule

Do not merge if the private production gate is weakened, if raw tokens are stored, if client code can choose a membership role, or if invitation acceptance can bypass trip membership rules.
