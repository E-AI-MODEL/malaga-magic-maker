-- BUILD 07 hardening: retire broad legacy storage access.
-- The reserved pending -> ready document flow is now the only upload/read path.

DROP POLICY IF EXISTS "Trip members can read trip documents" ON storage.objects;
DROP POLICY IF EXISTS "Trip members can upload trip documents" ON storage.objects;
