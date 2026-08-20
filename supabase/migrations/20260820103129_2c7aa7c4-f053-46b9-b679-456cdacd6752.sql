ALTER TABLE public.trip_documents
  ADD COLUMN IF NOT EXISTS extraction_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS extracted_summary text,
  ADD COLUMN IF NOT EXISTS extracted_suggestion jsonb,
  ADD COLUMN IF NOT EXISTS extracted_at timestamp with time zone;

ALTER TABLE public.trip_documents
  DROP CONSTRAINT IF EXISTS trip_documents_extraction_status_check;

ALTER TABLE public.trip_documents
  ADD CONSTRAINT trip_documents_extraction_status_check
  CHECK (extraction_status IN ('pending', 'processing', 'done', 'failed', 'skipped'));