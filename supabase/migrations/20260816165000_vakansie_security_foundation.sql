BEGIN;

-- Vakansie BUILD 01: forward-only multi-tenant security foundation.
-- Historical migrations intentionally remain untouched.

-- -----------------------------------------------------------------------------
-- 1. Neutralize legacy single-trip defaults for NEW trips only.
-- Existing prototype rows are preserved.
-- -----------------------------------------------------------------------------
ALTER TABLE public.trip ALTER COLUMN start_date DROP DEFAULT;
ALTER TABLE public.trip ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.trip ALTER COLUMN end_date DROP DEFAULT;
ALTER TABLE public.trip ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE public.trip ALTER COLUMN group_size SET DEFAULT 1;
ALTER TABLE public.trip ALTER COLUMN flights_note DROP DEFAULT;
ALTER TABLE public.trip ALTER COLUMN flights_note DROP NOT NULL;
ALTER TABLE public.trip ALTER COLUMN golf_min DROP DEFAULT;
ALTER TABLE public.trip ALTER COLUMN golf_min DROP NOT NULL;
ALTER TABLE public.trip ALTER COLUMN golf_max DROP DEFAULT;
ALTER TABLE public.trip ALTER COLUMN golf_max DROP NOT NULL;
ALTER TABLE public.trip ALTER COLUMN name DROP DEFAULT;

ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS destination_name text;
ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS destination_country text;
ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.trip'::regclass
      AND conname = 'trip_created_by_fkey'
  ) THEN
    ALTER TABLE public.trip
      ADD CONSTRAINT trip_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. Membership integrity and UUID-based identity foundations.
-- -----------------------------------------------------------------------------
ALTER TABLE public.trip_members DROP CONSTRAINT IF EXISTS trip_members_role_check;
ALTER TABLE public.trip_members
  ADD CONSTRAINT trip_members_role_check
  CHECK (role IN ('organizer', 'member')) NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.trip_members'::regclass
      AND conname = 'trip_members_user_id_fkey'
  ) THEN
    ALTER TABLE public.trip_members
      ADD CONSTRAINT trip_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS backup_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS paid_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Legacy name-based fields stay temporarily for compatibility, but new code must
-- use the UUID fields above.

-- -----------------------------------------------------------------------------
-- 3. Fix signup privilege escalation.
-- User-controlled auth metadata can never grant the global admin role.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );

  -- Normal self-signup is always a participant. Internal admin assignment must
  -- happen through a trusted administrative path, never through user metadata.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participant')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Harden helper functions and add safe co-member lookup.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shares_trip_with(_viewer_id uuid, _other_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _viewer_id = _other_id OR EXISTS (
    SELECT 1
    FROM public.trip_members viewer
    JOIN public.trip_members other_member
      ON other_member.trip_id = viewer.trip_id
    WHERE viewer.user_id = _viewer_id
      AND other_member.user_id = _other_id
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_username(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_trip_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_trip_organizer(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shares_trip_with(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_username(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_organizer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_trip_with(uuid, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Atomic trip creation and invite joining.
-- These are the only normal client paths for creating membership.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_trip_with_owner(
  p_name text,
  p_description text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_group_size integer DEFAULT 1,
  p_destination_name text DEFAULT NULL,
  p_destination_country text DEFAULT NULL,
  p_timezone text DEFAULT NULL,
  p_currency text DEFAULT 'EUR'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'trip_name_required';
  END IF;

  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION 'invalid_trip_dates';
  END IF;

  INSERT INTO public.trip (
    name,
    description,
    start_date,
    end_date,
    group_size,
    created_by,
    destination_name,
    destination_country,
    timezone,
    currency
  )
  VALUES (
    trim(p_name),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    p_start_date,
    p_end_date,
    GREATEST(COALESCE(p_group_size, 1), 1),
    v_user_id,
    NULLIF(trim(COALESCE(p_destination_name, '')), ''),
    NULLIF(trim(COALESCE(p_destination_country, '')), ''),
    NULLIF(trim(COALESCE(p_timezone, '')), ''),
    COALESCE(NULLIF(upper(trim(COALESCE(p_currency, ''))), ''), 'EUR')
  )
  RETURNING id INTO v_trip_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_user_id, 'organizer');

  RETURN v_trip_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_trip_by_code(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NULLIF(trim(p_invite_code), '') IS NULL THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  SELECT id
  INTO v_trip_id
  FROM public.trip
  WHERE invite_code = trim(p_invite_code)
  LIMIT 1;

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  RETURN v_trip_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_trip_with_owner(text, text, date, date, integer, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_trip_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_trip_with_owner(text, text, date, date, integer, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_trip_by_code(text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. Deterministic legacy backfill. Only do this when exactly one trip exists.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_trip_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.trip) = 1 THEN
    SELECT id INTO v_trip_id FROM public.trip LIMIT 1;

    UPDATE public.tasks SET trip_id = v_trip_id WHERE trip_id IS NULL;
    UPDATE public.submissions SET trip_id = v_trip_id WHERE trip_id IS NULL;
    UPDATE public.comments SET trip_id = v_trip_id WHERE trip_id IS NULL;
    UPDATE public.reactions SET trip_id = v_trip_id WHERE trip_id IS NULL;
    UPDATE public.travel_legs SET trip_id = v_trip_id WHERE trip_id IS NULL;
    UPDATE public.expenses SET trip_id = v_trip_id WHERE trip_id IS NULL;
    UPDATE public.notifications SET trip_id = v_trip_id WHERE trip_id IS NULL;
    UPDATE public.activity_log SET trip_id = v_trip_id WHERE trip_id IS NULL;
    UPDATE public.accommodations SET trip_id = v_trip_id WHERE trip_id IS NULL;
    UPDATE public.poi_categories SET trip_id = v_trip_id WHERE trip_id IS NULL;
  END IF;
END
$$;

-- Legacy global uniqueness is incompatible with multiple trips.
DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.submissions'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE 'UNIQUE (user_id)%'
  LOOP
    EXECUTE format('ALTER TABLE public.submissions DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS submissions_trip_user_unique
  ON public.submissions (trip_id, user_id)
  WHERE trip_id IS NOT NULL;

DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.reactions'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE 'UNIQUE (user_id, section, emoji)%'
  LOOP
    EXECUTE format('ALTER TABLE public.reactions DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS reactions_trip_user_section_emoji_unique
  ON public.reactions (trip_id, user_id, section, emoji)
  WHERE trip_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 7. Profiles and global role visibility.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can read own and co-member profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.shares_trip_with(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read roles" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- -----------------------------------------------------------------------------
-- 8. Trip and membership policies.
-- No direct trip/member INSERT policy remains; RPCs above own those operations.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can join trips" ON public.trip_members;
DROP POLICY IF EXISTS "Members can read own memberships" ON public.trip_members;
DROP POLICY IF EXISTS "Members can read trip memberships" ON public.trip_members;
DROP POLICY IF EXISTS "Organizers can manage members" ON public.trip_members;
DROP POLICY IF EXISTS "Organizers can update members" ON public.trip_members;
DROP POLICY IF EXISTS "Organizers can delete members" ON public.trip_members;

CREATE POLICY "Members can read trip memberships" ON public.trip_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_trip_member(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Organizers can update members" ON public.trip_members
  FOR UPDATE TO authenticated
  USING (
    public.is_trip_organizer(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.is_trip_organizer(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Organizers can delete members" ON public.trip_members
  FOR DELETE TO authenticated
  USING (
    public.is_trip_organizer(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Anyone can read trip" ON public.trip;
DROP POLICY IF EXISTS "Members can read their trips" ON public.trip;
DROP POLICY IF EXISTS "Users can create trips" ON public.trip;
DROP POLICY IF EXISTS "Authenticated can create trips" ON public.trip;
DROP POLICY IF EXISTS "Organizers can update trips" ON public.trip;
DROP POLICY IF EXISTS "Organizers can delete trips" ON public.trip;

CREATE POLICY "Members can read their trips" ON public.trip
  FOR SELECT TO authenticated
  USING (
    public.is_trip_member(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Organizers can update trips" ON public.trip
  FOR UPDATE TO authenticated
  USING (
    public.is_trip_organizer(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.is_trip_organizer(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Organizers can delete trips" ON public.trip
  FOR DELETE TO authenticated
  USING (
    public.is_trip_organizer(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- -----------------------------------------------------------------------------
-- 9. Tasks and task votes.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task owner can update progress" ON public.tasks;

CREATE POLICY "Trip members can read tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_member(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip organizers can insert tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip task owners can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR assigned_user_id = auth.uid()
      OR backup_user_id = auth.uid()
      OR assigned_to = (SELECT display_name FROM public.profiles WHERE id = auth.uid())
      OR backup_to = (SELECT display_name FROM public.profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
  );
CREATE POLICY "Trip organizers can delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Authenticated can read votes" ON public.task_votes;
DROP POLICY IF EXISTS "Users can insert own vote" ON public.task_votes;
DROP POLICY IF EXISTS "Users can update own vote" ON public.task_votes;
DROP POLICY IF EXISTS "Users can delete own vote" ON public.task_votes;

CREATE POLICY "Trip members can read task votes" ON public.task_votes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_votes.task_id
      AND t.trip_id IS NOT NULL
      AND (
        public.is_trip_member(auth.uid(), t.trip_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  ));
CREATE POLICY "Members can insert own task vote" ON public.task_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_votes.task_id
        AND t.trip_id IS NOT NULL
        AND public.is_trip_member(auth.uid(), t.trip_id)
        AND public.is_trip_member(voted_for_user_id, t.trip_id)
    )
  );
CREATE POLICY "Members can update own task vote" ON public.task_votes
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_votes.task_id
        AND t.trip_id IS NOT NULL
        AND public.is_trip_member(auth.uid(), t.trip_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_votes.task_id
        AND t.trip_id IS NOT NULL
        AND public.is_trip_member(auth.uid(), t.trip_id)
        AND public.is_trip_member(voted_for_user_id, t.trip_id)
    )
  );
CREATE POLICY "Members can delete own task vote" ON public.task_votes
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_votes.task_id
        AND t.trip_id IS NOT NULL
        AND public.is_trip_member(auth.uid(), t.trip_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 10. Comments and reactions.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert own comment" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comment" ON public.comments;

CREATE POLICY "Trip members can read comments" ON public.comments
  FOR SELECT TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_member(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip members can insert own comments" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
  );
CREATE POLICY "Trip members can delete own comments" ON public.comments
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
  );

DROP POLICY IF EXISTS "Authenticated can read reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can insert own reaction" ON public.reactions;
DROP POLICY IF EXISTS "Users can delete own reaction" ON public.reactions;

CREATE POLICY "Trip members can read reactions" ON public.reactions
  FOR SELECT TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_member(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip members can insert own reactions" ON public.reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
  );
CREATE POLICY "Trip members can delete own reactions" ON public.reactions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
  );

-- -----------------------------------------------------------------------------
-- 11. Travel legs and expenses.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read travel_legs" ON public.travel_legs;
DROP POLICY IF EXISTS "Admin can insert travel_legs" ON public.travel_legs;
DROP POLICY IF EXISTS "Admin can update travel_legs" ON public.travel_legs;
DROP POLICY IF EXISTS "Admin can delete travel_legs" ON public.travel_legs;

CREATE POLICY "Trip members can read travel legs" ON public.travel_legs
  FOR SELECT TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_member(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip organizers can insert travel legs" ON public.travel_legs
  FOR INSERT TO authenticated
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip organizers can update travel legs" ON public.travel_legs
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (trip_id IS NOT NULL);
CREATE POLICY "Trip organizers can delete travel legs" ON public.travel_legs
  FOR DELETE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Anyone can read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;

CREATE POLICY "Trip members can read expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_member(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip members can insert own expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
    AND (paid_by_user_id IS NULL OR public.is_trip_member(paid_by_user_id, trip_id))
  );
CREATE POLICY "Expense creator or organizer can update" ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
    AND (
      created_by = auth.uid()
      OR public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
    AND (paid_by_user_id IS NULL OR public.is_trip_member(paid_by_user_id, trip_id))
  );
CREATE POLICY "Expense creator or organizer can delete" ON public.expenses
  FOR DELETE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
    AND (
      created_by = auth.uid()
      OR public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- -----------------------------------------------------------------------------
-- 12. Legacy submissions, now scoped per trip.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own submission" ON public.submissions;
DROP POLICY IF EXISTS "Users can insert own submission" ON public.submissions;
DROP POLICY IF EXISTS "Users can update own unlocked submission" ON public.submissions;
DROP POLICY IF EXISTS "Admin can insert submissions" ON public.submissions;

CREATE POLICY "Users can read own trip submission" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      (user_id = auth.uid() AND public.is_trip_member(auth.uid(), trip_id))
      OR public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Users can insert own trip submission" ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
  );
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
      user_id = auth.uid()
      OR public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- -----------------------------------------------------------------------------
-- 13. Notifications and activity log.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Users can read own trip notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND (trip_id IS NULL OR public.is_trip_member(auth.uid(), trip_id))
  );
CREATE POLICY "Users can update own trip notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (trip_id IS NULL OR public.is_trip_member(auth.uid(), trip_id))
  )
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Trip members can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND trip_id IS NOT NULL
    AND public.is_trip_member(auth.uid(), trip_id)
    AND public.is_trip_member(user_id, trip_id)
  );

DROP POLICY IF EXISTS "Users can insert own logs" ON public.activity_log;
DROP POLICY IF EXISTS "Admin can read all logs" ON public.activity_log;
CREATE POLICY "Users can insert own authorized logs" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (trip_id IS NULL OR public.is_trip_member(auth.uid(), trip_id))
  );
CREATE POLICY "Internal admins can read activity logs" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- -----------------------------------------------------------------------------
-- 14. Legacy accommodations and POIs are still present, but must be trip-isolated.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read accommodations" ON public.accommodations;
DROP POLICY IF EXISTS "Admin can insert accommodations" ON public.accommodations;
DROP POLICY IF EXISTS "Admin can update accommodations" ON public.accommodations;
DROP POLICY IF EXISTS "Admin can delete accommodations" ON public.accommodations;

CREATE POLICY "Trip members can read accommodations" ON public.accommodations
  FOR SELECT TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_member(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip organizers can insert accommodations" ON public.accommodations
  FOR INSERT TO authenticated
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip organizers can update accommodations" ON public.accommodations
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (trip_id IS NOT NULL);
CREATE POLICY "Trip organizers can delete accommodations" ON public.accommodations
  FOR DELETE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Anyone can read poi_categories" ON public.poi_categories;
DROP POLICY IF EXISTS "Admin can insert poi_categories" ON public.poi_categories;
DROP POLICY IF EXISTS "Admin can update poi_categories" ON public.poi_categories;
DROP POLICY IF EXISTS "Admin can delete poi_categories" ON public.poi_categories;

CREATE POLICY "Trip members can read poi categories" ON public.poi_categories
  FOR SELECT TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_member(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip organizers can insert poi categories" ON public.poi_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "Trip organizers can update poi categories" ON public.poi_categories
  FOR UPDATE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (trip_id IS NOT NULL);
CREATE POLICY "Trip organizers can delete poi categories" ON public.poi_categories
  FOR DELETE TO authenticated
  USING (
    trip_id IS NOT NULL
    AND (
      public.is_trip_organizer(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Anyone can read pois" ON public.pois;
DROP POLICY IF EXISTS "Admin can insert pois" ON public.pois;
DROP POLICY IF EXISTS "Admin can update pois" ON public.pois;
DROP POLICY IF EXISTS "Admin can delete pois" ON public.pois;

CREATE POLICY "Trip members can read pois" ON public.pois
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.poi_categories c
    WHERE c.id = pois.category_id
      AND c.trip_id IS NOT NULL
      AND (
        public.is_trip_member(auth.uid(), c.trip_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  ));
CREATE POLICY "Trip organizers can insert pois" ON public.pois
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.poi_categories c
    WHERE c.id = pois.category_id
      AND c.trip_id IS NOT NULL
      AND (
        public.is_trip_organizer(auth.uid(), c.trip_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  ));
CREATE POLICY "Trip organizers can update pois" ON public.pois
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.poi_categories c
    WHERE c.id = pois.category_id
      AND c.trip_id IS NOT NULL
      AND (
        public.is_trip_organizer(auth.uid(), c.trip_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.poi_categories c
    WHERE c.id = pois.category_id
      AND c.trip_id IS NOT NULL
      AND (
        public.is_trip_organizer(auth.uid(), c.trip_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  ));
CREATE POLICY "Trip organizers can delete pois" ON public.pois
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.poi_categories c
    WHERE c.id = pois.category_id
      AND c.trip_id IS NOT NULL
      AND (
        public.is_trip_organizer(auth.uid(), c.trip_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  ));

-- App settings are global product configuration, not public trip data.
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Authenticated can read app settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------------
-- 15. Private travel-document storage foundation.
-- The object path must begin with the trip UUID: <trip-id>/<filename>.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-documents',
  'trip-documents',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Trip members can read trip documents" ON storage.objects;
DROP POLICY IF EXISTS "Trip members can upload trip documents" ON storage.objects;

CREATE POLICY "Trip members can read trip documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'trip-documents'
    AND EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.trip_id::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "Trip members can upload trip documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'trip-documents'
    AND EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.trip_id::text = (storage.foldername(name))[1]
    )
  );

COMMIT;
