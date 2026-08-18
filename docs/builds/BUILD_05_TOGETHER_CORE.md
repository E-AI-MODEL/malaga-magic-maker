# BUILD 05 - Samen core

Status: implementation branch
Branch: `vakansie/build-05-together-core`

## Goal

Turn Samen into the generic collaboration domain for a trip: people, tasks, choices and shared costs. Reuse safe existing concepts and normalize the legacy identity fields instead of creating duplicate architectures.

## Product language

Internal / technical concepts do not automatically become copy.

| Domain | Technical | Customer language |
|---|---|---|
| membership | `trip_members` | Medereizigers |
| work item | `tasks` | Taken / Nog regelen |
| decision | `decisions` | Keuzes |
| choice candidate | `decision_options` | Optie |
| vote | `decision_votes` | Stem |
| expense | `expenses` | Kosten |
| normalized split | `expense_splits` | Verdeling |

## People

Reuse `trip_members` and `profiles`.

BUILD 05 is read/manage-display only for members. Creating secure revocable invites belongs to BUILD 06.

## Tasks

Reuse `tasks`, but new product code must use UUID identity only.

Schema additions:
- `created_by`
- `description`
- `due_at`
- `priority`
- safe default for legacy-required `section`

Rules:
- new task UI never writes `assigned_to`, `backup_to`, `paid_by` or name arrays
- new assignments use `assigned_user_id`
- display-name fallback is removed from task authorization
- organizer/admin may fully manage tasks
- creator may manage its task while remaining a trip member
- assigned member may change progress/status/details but not identity/assignment/title/due date
- non-organizer member may create an unassigned/self-assigned task; assigning another member on creation is organizer-only

## Decisions / Keuzes

New generic tables:
- `decisions`
- `decision_options`
- `decision_votes`

A decision belongs to a trip. A member can create one. Creator or organizer manages title/options/open/closed state. Members can vote while open.

`max_choices` makes the data model extensible; BUILD 05 customer UI defaults to one choice.

Votes use UUID identity. Option/decision mismatch is impossible through a composite FK.

## Expenses / Kosten

Keep `expenses` as the expense header and introduce `expense_splits` as normalized UUID shares.

Legacy fields `paid_by` and `split_among` remain only for compatibility; new product code does not use them as relational identity.

Add currency to expenses.

Create/update must be atomic through authenticated RPCs:
- `create_expense_with_splits`
- `update_expense_with_splits`

The RPCs validate:
- authenticated caller
- caller belongs to trip
- payer belongs to trip
- every split user belongs to trip
- split amounts are non-negative
- split total exactly equals expense total
- update caller is creator, trip organizer or internal admin

## Security

All new tables have RLS.

Every nested row derives trip authorization from its protected parent.

No display name, username or email participates in authorization.

## Frontend

`/trip/:tripId/samen` becomes a four-part mobile-first workspace:
- Medereizigers
- Taken
- Keuzes
- Kosten

Use cards/sections rather than internal database terminology.

Archived trips are read-only.

## Migration strategy

Do not erase legacy name fields or old Malaga records in this build.

Backfill new task `created_by` generically from the trip creator where possible. Do not infer legacy assignee UUIDs from display names.

Existing expenses do not receive fabricated UUID splits from name arrays. They remain clearly legacy until explicitly reconciled.

## Acceptance criteria

### Database
- forward migration only
- task UUID authorization no longer contains display-name fallback
- decisions/options/votes created with RLS
- expense_splits created with RLS
- atomic expense RPCs present and execution restricted to authenticated
- live migration registered
- central application Database type matches live additions via generated types or documented overlay

### Authorization tests
Use transactions with rollback.
- outsider reads zero decision/task/expense-split data for another trip
- outsider cannot create decision/task/expense
- member can vote only on a decision in own trip
- option must belong to the voted decision
- member cannot exceed max_choices
- non-organizer cannot assign a newly-created task to another member
- assigned member can update status/progress but cannot reassign task
- expense create with invalid/nonmember split fails
- valid expense + splits are created atomically
- invalid split total creates nothing

### Product
- Samen shows member identities by profile but authorizes by UUID
- task add/edit/complete works with UUID assignments
- decision create/vote/close flow works
- expense create and split display works
- no old fixed names, Malaga or golf assumptions in new components
- legacy records are not falsely normalized

### Quality
- typecheck
- Edge Function checks
- lint
- tests
- production build

## Merge rule

Do not merge until migration is live, authorization/atomicity tests pass and the full quality gate is green. Never repair a frontend permission issue by broadening RLS beyond the product rules above.
