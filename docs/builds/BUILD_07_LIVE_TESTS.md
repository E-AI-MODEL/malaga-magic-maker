# BUILD 07 live authorization checks

The connected production database was checked before merge.

## Storage policy hardening

Applied and registered:
- `20260818140500_harden_trip_document_storage`
- `20260818141000_allow_reserved_pending_document_owner`

Removed obsolete broad policies:
- `Trip members can read trip documents`
- `Trip members can upload trip documents`

Remaining trip-document storage policies are the reserved uploader INSERT policy, ready-document member SELECT policy and owner/organizer DELETE policy.

## Rollback checks

The following checks were executed inside database transactions and rolled back:

- direct storage INSERT to an unreserved path as the authenticated trip member was rejected by RLS: PASS
- upload to a path with matching pending document reservation as the authenticated uploader succeeded: PASS
- ready private storage object was invisible to an authenticated outsider identity: PASS
- ready document metadata was visible to a member of its trip: PASS
- ready document metadata was invisible to an outsider identity: PASS

No test document or object was persisted.

## Pending visibility rule

The metadata SELECT policy now allows:
- `ready` documents to trip members/internal admin
- `pending` metadata only to the uploader while that user is still a trip member

This limited pending visibility is necessary because the reserved storage INSERT policy resolves the reservation through `trip_documents`. Other trip members cannot use a pending document as a readable trip document.
