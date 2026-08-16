BEGIN;

-- Existing prototype task attachments remain readable so old records do not
-- break, but no new consumer uploads may enter this public bucket. BUILD 06
-- replaces document/booking uploads with the private trip-documents flow.
DROP POLICY IF EXISTS "Authenticated can upload task attachments" ON storage.objects;

COMMIT;
