-- BUILD 07 live foundation: private trip documents.
-- This file restores source control for migration version 20260818081500,
-- which is already registered and applied in the connected production database.

CREATE TABLE IF NOT EXISTS public.trip_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trip(id) ON DELETE CASCADE,
  trip_item_id uuid REFERENCES public.trip_items(id) ON DELETE SET NULL,
  uploaded_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  filename text NOT NULL CHECK (length(btrim(filename)) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png','image/webp')),
  document_type text NOT NULL DEFAULT 'other' CHECK (document_type IN ('booking_confirmation','ticket','voucher','insurance','other')),
  storage_path text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready')),
  size_bytes bigint CHECK (size_bytes IS NULL OR (size_bytes > 0 AND size_bytes <= 20971520)),
  created_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz
);

CREATE INDEX IF NOT EXISTS trip_documents_trip_id_idx ON public.trip_documents (trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trip_documents_trip_item_id_idx ON public.trip_documents (trip_item_id);
CREATE INDEX IF NOT EXISTS trip_documents_uploaded_by_idx ON public.trip_documents (uploaded_by);

ALTER TABLE public.trip_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.trip_documents FROM anon, authenticated;
GRANT SELECT, DELETE ON public.trip_documents TO authenticated;

DROP POLICY IF EXISTS "Trip members can read ready documents" ON public.trip_documents;
CREATE POLICY "Trip members can read ready documents"
ON public.trip_documents FOR SELECT TO authenticated
USING (
  status = 'ready'
  AND (
    public.is_trip_member(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Document owners and organizers can delete metadata" ON public.trip_documents;
CREATE POLICY "Document owners and organizers can delete metadata"
ON public.trip_documents FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.is_trip_organizer(auth.uid(), trip_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.enforce_trip_document_item_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.trip_item_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.trip_items i
       WHERE i.id = NEW.trip_item_id AND i.trip_id = NEW.trip_id
     ) THEN
    RAISE EXCEPTION 'document_item_trip_mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_trip_document_item_scope ON public.trip_documents;
CREATE TRIGGER enforce_trip_document_item_scope
BEFORE INSERT OR UPDATE OF trip_item_id, trip_id ON public.trip_documents
FOR EACH ROW EXECUTE FUNCTION public.enforce_trip_document_item_scope();

CREATE OR REPLACE FUNCTION public.reserve_trip_document(
  p_trip_id uuid,
  p_trip_item_id uuid,
  p_filename text,
  p_mime_type text,
  p_document_type text DEFAULT 'other'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_path text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_trip_member(v_user_id, p_trip_id) THEN
    RAISE EXCEPTION 'not_trip_member' USING ERRCODE = '42501';
  END IF;
  IF p_filename IS NULL OR length(btrim(p_filename)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'invalid_filename' USING ERRCODE = '23514';
  END IF;
  IF p_mime_type NOT IN ('application/pdf','image/jpeg','image/png','image/webp') THEN
    RAISE EXCEPTION 'unsupported_document_type' USING ERRCODE = '23514';
  END IF;
  IF p_document_type NOT IN ('booking_confirmation','ticket','voucher','insurance','other') THEN
    RAISE EXCEPTION 'invalid_document_type' USING ERRCODE = '23514';
  END IF;
  IF p_trip_item_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.trip_items i
    WHERE i.id = p_trip_item_id AND i.trip_id = p_trip_id
  ) THEN
    RAISE EXCEPTION 'document_item_trip_mismatch' USING ERRCODE = '23514';
  END IF;

  v_path := p_trip_id::text || '/' || v_id::text;

  INSERT INTO public.trip_documents (
    id, trip_id, trip_item_id, uploaded_by, filename, mime_type, document_type, storage_path
  ) VALUES (
    v_id, p_trip_id, p_trip_item_id, v_user_id, btrim(p_filename), p_mime_type, p_document_type, v_path
  );

  RETURN jsonb_build_object('id', v_id, 'storage_path', v_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_trip_document(p_document_id uuid, p_size_bytes bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_doc public.trip_documents%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_doc
  FROM public.trip_documents
  WHERE id = p_document_id
  FOR UPDATE;

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'document_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_doc.uploaded_by <> v_user_id THEN
    RAISE EXCEPTION 'document_finalize_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_size_bytes IS NULL OR p_size_bytes <= 0 OR p_size_bytes > 20971520 THEN
    RAISE EXCEPTION 'invalid_document_size' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id = 'trip-documents' AND o.name = v_doc.storage_path
  ) THEN
    RAISE EXCEPTION 'document_object_missing' USING ERRCODE = '23514';
  END IF;

  UPDATE public.trip_documents
  SET status = 'ready', size_bytes = p_size_bytes, ready_at = COALESCE(ready_at, now())
  WHERE id = p_document_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_trip_document(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_trip_document(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_trip_document(uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_trip_document(uuid, bigint) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-documents',
  'trip-documents',
  false,
  20971520,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Reserved uploader can upload trip document" ON storage.objects;
CREATE POLICY "Reserved uploader can upload trip document"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'trip-documents'
  AND EXISTS (
    SELECT 1 FROM public.trip_documents d
    WHERE d.storage_path = objects.name
      AND d.status = 'pending'
      AND d.uploaded_by = auth.uid()
      AND public.is_trip_member(auth.uid(), d.trip_id)
  )
);

DROP POLICY IF EXISTS "Trip members can read private trip documents" ON storage.objects;
CREATE POLICY "Trip members can read private trip documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trip-documents'
  AND EXISTS (
    SELECT 1 FROM public.trip_documents d
    WHERE d.storage_path = objects.name
      AND d.status = 'ready'
      AND (
        public.is_trip_member(auth.uid(), d.trip_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

DROP POLICY IF EXISTS "Document owners and organizers can delete private trip document" ON storage.objects;
CREATE POLICY "Document owners and organizers can delete private trip document"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'trip-documents'
  AND EXISTS (
    SELECT 1 FROM public.trip_documents d
    WHERE d.storage_path = objects.name
      AND (
        d.uploaded_by = auth.uid()
        OR public.is_trip_organizer(auth.uid(), d.trip_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

CREATE OR REPLACE FUNCTION public.on_document_ready_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status <> 'ready' AND NEW.status = 'ready' THEN
    PERFORM public.emit_trip_activity(
      NEW.trip_id,
      NEW.uploaded_by,
      'document.added',
      'trip_document',
      NEW.id::text,
      'Document toegevoegd',
      jsonb_build_object('filename', NEW.filename, 'document_type', NEW.document_type)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_ready_activity ON public.trip_documents;
CREATE TRIGGER document_ready_activity
AFTER UPDATE OF status ON public.trip_documents
FOR EACH ROW EXECUTE FUNCTION public.on_document_ready_activity();