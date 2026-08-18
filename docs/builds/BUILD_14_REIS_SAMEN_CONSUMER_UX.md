# BUILD 14 - Reis and Samen consumer UX

## Goal

Bring the two core trip areas to the same consumer-product level as BUILD 13 without adding new business domains or changing backend authorization.

## Reis

- replace the dashboard-like intro with a clear trip-plan summary
- show how many items are confirmed and how many still need attention
- add fast, understandable add actions for common travel items
- quick add may preselect a generic item type but must still open the normal edit sheet before saving
- keep the chronological timeline as the source of truth
- visually distinguish confirmed, still-to-arrange and completed items without relying on color alone
- keep edit/delete permissions unchanged
- keep Documents inside Reis and private-document behavior unchanged
- archived trips remain read-only

Customer language:
- Reisplan
- Nog te regelen
- Bevestigd
- Toevoegen
- Vliegtuig / Trein / Verblijf / Activiteit / Anders

Do not expose `trip_items`, item IDs, metadata or implementation status names.

## Samen

- default to a lightweight Samen overview rather than dropping the user straight into one management list
- show a concise summary of people, open tasks, open choices and shared expenses
- surface personal attention first: tasks assigned to the current user and open choices where the user has not voted yet
- provide clear quick actions for a new task, choice or shared expense
- keep detailed sections for Taken, Keuzes, Kosten and Mensen
- make section switching compact and mobile-friendly
- keep existing authorization and ownership rules for complete/edit/delete/vote
- archived trips remain read-only

Customer language:
- Samen
- Voor jou
- Taken
- Keuzes
- Kosten
- Mensen
- Nieuwe taak
- Nieuwe keuze
- Kosten toevoegen

Do not expose UUID migration wording or technical fallback language in normal active-trip UI.

## Non-goals

- no schema or RLS changes
- no auth/invite redesign
- no settlement/payment engine
- no chat/social feed
- no travel search or external destination content
- no new notification types
- no new primary navigation item

## Acceptance

- `/trip/:tripId/reis` remains the Reis route
- `/trip/:tripId/samen` remains the Samen route
- quick add in Reis opens the existing item editor with an appropriate type preselected and never saves silently
- Reis timeline remains generic for any destination and vacation type
- Samen opens on an overview with personal attention when available
- all existing task, decision, expense and membership permissions are preserved
- no Malaga/golf/fixed-person assumptions are introduced
- mobile first, desktop functional
- typecheck, Edge Function checks, lint, tests, production build and runtime dependency audit pass
