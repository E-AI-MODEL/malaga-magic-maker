-- BUILD 04: generic chronological travel/booking model.
-- This table is intentionally destination-agnostic. Legacy Malaga structures
-- are not copied into it automatically.

CREATE TABLE IF NOT EXISTS public.trip_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trip(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (length(btrim(type)) > 0),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  status text NOT NULL DEFAULT 'planned' CHECK (length(btrim(status)) > 0),
  start_at timestamptz,
  end_at timestamptz,
  timezone text,
  location_name text,
  address text,
  latitude numeric,
  longitude numeric,
  provider text,
  booking_reference text,
  booking_url text,
  price numeric CHECK (price IS NULL OR price >= 0),
  currency text CHECK (currency IS NULL OR char_length(currency) = 3),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_items_time_order CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
);

CREATE INDEX IF NOT EXISTS trip_items_trip_id_idx ON public.trip_items (trip_id);
CREATE INDEX IF NOT EXISTS trip_items_trip_start_idx ON public.trip_items (trip_id, start_at);
CREATE INDEX IF NOT EXISTS trip_items_created_by_idx ON public.trip_items (created_by);

DROP TRIGGER IF EXISTS update_trip_items_updated_at ON public.trip_items;
CREATE TRIGGER update_trip_items_updated_at
BEFORE UPDATE ON public.trip_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_trip_item_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Authenticated clients may not move an item to another trip or rewrite
  -- authorship. Privileged maintenance (auth.uid() IS NULL) may do so when
  -- required for account deletion/migration workflows.
  IF auth.uid() IS NOT NULL THEN
    IF NEW.trip_id IS DISTINCT FROM OLD.trip_id THEN
      RAISE EXCEPTION 'trip_item_trip_id_immutable';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'trip_item_created_by_immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_trip_item_identity ON public.trip_items;
CREATE TRIGGER enforce_trip_item_identity
BEFORE UPDATE ON public.trip_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_trip_item_identity();

ALTER TABLE public.trip_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can read trip items" ON public.trip_items;
CREATE POLICY "Trip members can read trip items"
ON public.trip_items
FOR SELECT
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Trip members can create trip items" ON public.trip_items;
CREATE POLICY "Trip members can create trip items"
ON public.trip_items
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.is_trip_member(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Creators and organizers can update trip items" ON public.trip_items;
CREATE POLICY "Creators and organizers can update trip items"
ON public.trip_items
FOR UPDATE
TO authenticated
USING (
  (
    public.is_trip_member(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND (
    created_by = auth.uid()
    OR public.is_trip_organizer(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  (
    public.is_trip_member(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND (
    created_by = auth.uid()
    OR public.is_trip_organizer(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Creators and organizers can delete trip items" ON public.trip_items;
CREATE POLICY "Creators and organizers can delete trip items"
ON public.trip_items
FOR DELETE
TO authenticated
USING (
  (
    public.is_trip_member(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND (
    created_by = auth.uid()
    OR public.is_trip_organizer(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_items TO authenticated;
