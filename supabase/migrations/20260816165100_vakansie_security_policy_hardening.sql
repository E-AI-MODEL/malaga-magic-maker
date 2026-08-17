BEGIN;

-- Follow-up hardening for BUILD 01. This keeps the first migration readable
-- while making update semantics explicit and safe for hand-crafted requests.

-- Do not let authenticated callers use has_role to probe another user's role.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles caller_role
      WHERE caller_role.user_id = auth.uid()
        AND caller_role.role = 'admin'::public.app_role
    )
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Prevent direct use of the co-membership helper with a forged viewer id.
CREATE OR REPLACE FUNCTION public.shares_trip_with(_viewer_id uuid, _other_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _viewer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND (
    _viewer_id = _other_id
    OR EXISTS (
      SELECT 1
      FROM public.trip_members viewer
      JOIN public.trip_members other_member
        ON other_member.trip_id = viewer.trip_id
      WHERE viewer.user_id = _viewer_id
        AND other_member.user_id = _other_id
    )
  )
$$;

-- get_username is legacy but must obey the same co-member visibility boundary.
CREATE OR REPLACE FUNCTION public.get_username(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username
  FROM public.profiles
  WHERE id = _user_id
    AND (
      _user_id = auth.uid()
      OR public.shares_trip_with(auth.uid(), _user_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shares_trip_with(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_username(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_trip_with(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_username(uuid) TO authenticated;

-- Membership identity is immutable. Organizers may change role or delete a
-- membership, but may not turn an existing row into a membership for someone
-- else or another trip.
CREATE OR REPLACE FUNCTION public.enforce_trip_member_identity_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trip_id IS DISTINCT FROM OLD.trip_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'membership_identity_immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_trip_member_identity_immutable() FROM PUBLIC;
DROP TRIGGER IF EXISTS enforce_trip_member_identity_immutable ON public.trip_members;
CREATE TRIGGER enforce_trip_member_identity_immutable
  BEFORE UPDATE ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trip_member_identity_immutable();

-- Assigned members may maintain operational task fields, but cannot use the
-- broad UPDATE SQL verb to change ownership, trip identity, title or costs.
CREATE OR REPLACE FUNCTION public.enforce_task_member_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_display_name text;
  v_is_privileged boolean;
  v_is_assigned boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  v_is_privileged := public.has_role(v_user_id, 'admin'::public.app_role)
    OR public.is_trip_organizer(v_user_id, OLD.trip_id);

  IF v_is_privileged THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_display_name
  FROM public.profiles
  WHERE id = v_user_id;

  v_is_assigned := public.is_trip_member(v_user_id, OLD.trip_id)
    AND (
      OLD.assigned_user_id = v_user_id
      OR OLD.backup_user_id = v_user_id
      OR OLD.assigned_to = v_display_name
      OR OLD.backup_to = v_display_name
    );

  IF NOT v_is_assigned THEN
    RAISE EXCEPTION 'task_update_forbidden' USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.trip_id IS DISTINCT FROM OLD.trip_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.section IS DISTINCT FROM OLD.section
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.backup_to IS DISTINCT FROM OLD.backup_to
     OR NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id
     OR NEW.backup_user_id IS DISTINCT FROM OLD.backup_user_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.cost IS DISTINCT FROM OLD.cost
     OR NEW.paid_by IS DISTINCT FROM OLD.paid_by
     OR NEW.cost_split_among IS DISTINCT FROM OLD.cost_split_among THEN
    RAISE EXCEPTION 'assigned_member_may_only_update_task_progress_and_details' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_task_member_update_scope() FROM PUBLIC;
DROP TRIGGER IF EXISTS enforce_task_member_update_scope ON public.tasks;
CREATE TRIGGER enforce_task_member_update_scope
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_task_member_update_scope();

DROP POLICY IF EXISTS "Trip task owners can update tasks" ON public.tasks;
CREATE POLICY "Trip task owners can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_trip_organizer(auth.uid(), trip_id)
      OR (
        public.is_trip_member(auth.uid(), trip_id)
        AND (
          assigned_user_id = auth.uid()
          OR backup_user_id = auth.uid()
          OR assigned_to = (SELECT display_name FROM public.profiles WHERE id = auth.uid())
          OR backup_to = (SELECT display_name FROM public.profiles WHERE id = auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_trip_organizer(auth.uid(), trip_id)
      OR (
        public.is_trip_member(auth.uid(), trip_id)
        AND (
          assigned_user_id = auth.uid()
          OR backup_user_id = auth.uid()
          OR assigned_to = (SELECT display_name FROM public.profiles WHERE id = auth.uid())
          OR backup_to = (SELECT display_name FROM public.profiles WHERE id = auth.uid())
        )
      )
    )
  );

-- Update policies must validate the NEW trip_id as well, not only the old row.
DROP POLICY IF EXISTS "Trip organizers can update travel legs" ON public.travel_legs;
CREATE POLICY "Trip organizers can update travel legs" ON public.travel_legs
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Expense creator or organizer can update" ON public.expenses;
CREATE POLICY "Expense creator or organizer can update" ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        public.is_trip_member(auth.uid(), trip_id)
        AND (
          created_by = auth.uid()
          OR public.is_trip_organizer(auth.uid(), trip_id)
        )
      )
    )
  )
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        public.is_trip_member(auth.uid(), trip_id)
        AND (
          created_by = auth.uid()
          OR public.is_trip_organizer(auth.uid(), trip_id)
        )
      )
    )
    AND (paid_by_user_id IS NULL OR public.is_trip_member(paid_by_user_id, trip_id))
  );

DROP POLICY IF EXISTS "Expense creator or organizer can delete" ON public.expenses;
CREATE POLICY "Expense creator or organizer can delete" ON public.expenses
  FOR DELETE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        public.is_trip_member(auth.uid(), trip_id)
        AND (
          created_by = auth.uid()
          OR public.is_trip_organizer(auth.uid(), trip_id)
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own unlocked trip submission" ON public.submissions;
CREATE POLICY "Users can update own unlocked trip submission" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      (user_id = auth.uid() AND locked = false AND public.is_trip_member(auth.uid(), trip_id))
      OR public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      (user_id = auth.uid() AND public.is_trip_member(auth.uid(), trip_id))
      OR public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Users can update own trip notifications" ON public.notifications;
CREATE POLICY "Users can update own trip notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (trip_id IS NULL OR public.is_trip_member(auth.uid(), trip_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (trip_id IS NULL OR public.is_trip_member(auth.uid(), trip_id))
  );

DROP POLICY IF EXISTS "Trip organizers can update accommodations" ON public.accommodations;
CREATE POLICY "Trip organizers can update accommodations" ON public.accommodations
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Trip organizers can update poi categories" ON public.poi_categories;
CREATE POLICY "Trip organizers can update poi categories" ON public.poi_categories
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

COMMIT;
