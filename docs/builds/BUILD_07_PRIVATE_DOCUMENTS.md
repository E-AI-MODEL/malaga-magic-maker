# BUILD 07 - Private documents

Status: implementation branch
Branch: `vakansie/build-07-private-documents`

## Goal

Make private travel documents a usable first-class Reis feature without creating a new primary navigation destination.

## Product language

- technical: `trip_documents`, storage bucket `trip-documents`
- internal work name: document layer
- customer-facing: `Documenten`
- document types: Boeking, Ticket, Voucher, Verzekering, Overig

Users never see storage paths, bucket names, pending/ready states or RPC terminology.

## Existing live foundation

The connected database already contains migration history version `20260818081500` (`private_trip_documents`) with:
- private `trip-documents` bucket
- 20 MB limit
- PDF/JPEG/PNG/WebP allowlist
- `trip_documents` metadata table
- optional `trip_item_id` link
- `reserve_trip_document` and `finalize_trip_document` RPCs
- ready-only metadata policy
- reserved-uploader storage policy

The matching migration file is missing from GitHub and must be restored as source-controlled schema history.

Two older broad storage policies also remain active and bypass the pending/ready reservation model. BUILD 07 must remove them with a new forward migration:
- `Trip members can read trip documents`
- `Trip members can upload trip documents`

## Upload flow

1. authenticated trip member chooses a supported file
2. client calls `reserve_trip_document`
3. DB creates pending metadata and returns opaque storage path
4. client uploads exactly to that reserved path in private storage
5. client calls `finalize_trip_document` with actual file size
6. document becomes visible to trip members only when status is `ready`

A failed upload must not appear as a usable document.

## Read flow

- list only ready metadata visible through RLS
- open/download by creating a short-lived signed URL from private storage
- do not persist signed URLs

## Item relationship

Upload may optionally be linked to an existing `trip_item` from the same trip.
The DB trigger/RPC rejects cross-trip item links.

## Delete

Uploader or organizer may delete a document through the authorized storage/metadata flow.
Do not expose delete controls to users who cannot perform the operation.

## UI

`/trip/:tripId/reis` gains a `Documenten` section below the timeline:
- empty state
- upload button
- file name
- understandable document type
- optional linked reisonderdeel title
- file size/date
- open/download action
- delete where allowed

Mobile-first, no new bottom-nav tab.

## Authorization acceptance

Use rollback tests and real policies:
- member of trip A can reserve/upload/finalize/read trip A document
- outsider sees zero metadata and cannot reserve
- cross-trip `trip_item_id` is rejected
- arbitrary direct storage upload without a reserved pending metadata row is rejected
- pending document is not readable by another member
- ready document is readable by a trip member
- outsider cannot read storage object
- uploader/organizer delete allowed; unrelated member cannot delete

## Schema source acceptance

- restore source file for already-applied `20260818081500_private_trip_documents`
- add a new forward-only hardening migration for obsolete broad storage policies
- do not edit earlier applied migrations
- application Database overlay matches the live document table/RPC shape until canonical Supabase type generation is available

## Quality

- typecheck
- Edge Function checks
- lint
- tests
- production build
- no Malaga/golf/fixed-person assumptions

## Merge rule

Do not merge until the broad storage-policy bypass is removed, authorization tests pass, upload/read flows use private storage correctly and the full quality gate is green.