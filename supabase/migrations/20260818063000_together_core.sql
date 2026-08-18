-- BUILD 05: generic Samen collaboration core.
-- Reuse existing memberships/tasks/expenses, normalize UUID identity, and add
-- generic decisions plus atomic normalized expense splits.

-- ---------------------------------------------------------------------------
-- Tasks: add generic product fields and remove display-name authorization.
-- ---------------------------------------------------------------------------

-- The previous trigger rejects privileged migration sessions because auth.uid()
-- is null. Drop it inside the migration transaction, backfill, then recreate the
-- stricter UUID-only trigger before commit. DDL locks prevent a visible gap.
DROP TRIGGER IF EXISTS enforce_task_member_update_scope ON public.tasks;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';

ALTER TABLE public.tasks ALTER COLUMN section SET DEFAULT 'general';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'normal', 'high'));
  END IF;
END;
$$;

UPDATE public.tasks AS t
SET created_by = tr.created_by
FROM public.trip AS tr
WHERE t.created_by IS NULL
  AND t.trip_id = tr.id
  AND tr.created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_trip_due_idx ON public.tasks (trip_id, due_at);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON public.tasks (created_by);
CREATE INDEX IF NOT EXISTS tasks_assigned_user_id_idx ON public.tasks (assigned_user_id);

DROP POLICY IF EXISTS "Trip organizers can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Trip task owners can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Trip organizers can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Trip members can create safe tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task participants can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creators and organizers can delete tasks" ON public.tasks;

CREATE POLICY "Trip members can create safe tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  trip_id IS NOT NULL
  AND created_by = auth.uid()
  AND public.is_trip_member(auth.uid(), trip_id)
  AND (assigned_user_id IS NULL OR public.is_trip_member(assigned_user_id, trip_id))
  AND (backup_user_id IS NULL OR public.is_trip_member(backup_user_id, trip_id))
  AND (
    public.is_trip_organizer(auth.uid(), trip_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      (assigned_user_id IS NULL OR assigned_user_id = auth.uid())
      AND (backup_user_id IS NULL OR backup_user_id = auth.uid())
    )
  )
);

CREATE POLICY "Task participants can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  trip_id IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_trip_organizer(auth.uid(), trip_id)
    OR (
      public.is_trip_member(auth.uid(), trip_id)
      AND (
        created_by = auth.uid()
        OR assigned_user_id = auth.uid()
        OR backup_user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  trip_id IS NOT NULL
  AND (assigned_user_id IS NULL OR public.is_trip_member(assigned_user_id, trip_id))
  AND (backup_user_id IS NULL OR public.is_trip_member(backup_user_id, trip_id))
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_trip_organizer(auth.uid(), trip_id)
    OR (
      public.is_trip_member(auth.uid(), trip_id)
      AND (
        created_by = auth.uid()
        OR assigned_user_id = auth.uid()
        OR backup_user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Task creators and organizers can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  trip_id IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_trip_organizer(auth.uid(), trip_id)
    OR (public.is_trip_member(auth.uid(), trip_id) AND created_by = auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.enforce_task_member_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_privileged boolean;
  v_is_creator boolean;
  v_is_assigned boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.trip_id IS DISTINCT FROM OLD.trip_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'task_identity_immutable' USING ERRCODE = '42501';
  END IF;

  v_is_privileged := public.has_role(v_user_id, 'admin'::public.app_role)
    OR public.is_trip_organizer(v_user_id, OLD.trip_id);

  IF v_is_privileged THEN
    RETURN NEW;
  END IF;

  v_is_creator := OLD.created_by = v_user_id
    AND public.is_trip_member(v_user_id, OLD.trip_id);

  IF v_is_creator THEN
    IF (NEW.assigned_user_id IS NOT NULL AND NEW.assigned_user_id <> v_user_id)
       OR (NEW.backup_user_id IS NOT NULL AND NEW.backup_user_id <> v_user_id) THEN
      RAISE EXCEPTION 'task_creator_cannot_assign_other_members' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  v_is_assigned := public.is_trip_member(v_user_id, OLD.trip_id)
    AND (OLD.assigned_user_id = v_user_id OR OLD.backup_user_id = v_user_id);

  IF NOT v_is_assigned THEN
    RAISE EXCEPTION 'task_update_forbidden' USING ERRCODE = '42501';
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.section IS DISTINCT FROM OLD.section
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.backup_to IS DISTINCT FROM OLD.backup_to
     OR NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id
     OR NEW.backup_user_id IS DISTINCT FROM OLD.backup_user_id
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
     OR NEW.due_at IS DISTINCT FROM OLD.due_at
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.cost IS DISTINCT FROM OLD.cost
     OR NEW.paid_by IS DISTINCT FROM OLD.paid_by
     OR NEW.cost_split_among IS DISTINCT FROM OLD.cost_split_among THEN
    RAISE EXCEPTION 'assigned_member_may_only_update_task_status_progress_and_details' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_task_member_update_scope
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.enforce_task_member_update_scope();

-- ---------------------------------------------------------------------------
-- Generic group decisions.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trip(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  max_choices integer NOT NULL DEFAULT 1 CHECK (max_choices > 0),
  closes_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.decision_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(btrim(label)) > 0),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, decision_id)
);

CREATE TABLE IF NOT EXISTS public.decision_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  option_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decision_votes_option_decision_fkey
    FOREIGN KEY (option_id, decision_id)
    REFERENCES public.decision_options(id, decision_id)
    ON DELETE CASCADE,
  UNIQUE (decision_id, user_id, option_id)
);

CREATE INDEX IF NOT EXISTS decisions_trip_id_idx ON public.decisions (trip_id);
CREATE INDEX IF NOT EXISTS decision_options_decision_id_idx ON public.decision_options (decision_id, sort_order);
CREATE INDEX IF NOT EXISTS decision_votes_decision_id_idx ON public.decision_votes (decision_id);
CREATE INDEX IF NOT EXISTS decision_votes_user_id_idx ON public.decision_votes (user_id);

DROP TRIGGER IF EXISTS update_decisions_updated_at ON public.decisions;
CREATE TRIGGER update_decisions_updated_at
BEFORE UPDATE ON public.decisions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_decision_options_updated_at ON public.decision_options;
CREATE TRIGGER update_decision_options_updated_at
BEFORE UPDATE ON public.decision_options
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_decision_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.trip_id IS DISTINCT FROM OLD.trip_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'decision_identity_immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_decision_identity ON public.decisions;
CREATE TRIGGER enforce_decision_identity
BEFORE UPDATE ON public.decisions
FOR EACH ROW EXECUTE FUNCTION public.enforce_decision_identity();

CREATE OR REPLACE FUNCTION public.enforce_decision_option_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.decision_id IS DISTINCT FROM OLD.decision_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'decision_option_identity_immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_decision_option_identity ON public.decision_options;
CREATE TRIGGER enforce_decision_option_identity
BEFORE UPDATE ON public.decision_options
FOR EACH ROW EXECUTE FUNCTION public.enforce_decision_option_identity();

CREATE OR REPLACE FUNCTION public.enforce_decision_vote_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trip_id uuid;
  v_status text;
  v_max_choices integer;
  v_current integer;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'decision_vote_identity_invalid' USING ERRCODE = '42501';
  END IF;

  SELECT d.trip_id, d.status, d.max_choices
  INTO v_trip_id, v_status, v_max_choices
  FROM public.decisions d
  WHERE d.id = NEW.decision_id;

  IF v_trip_id IS NULL OR NOT public.is_trip_member(auth.uid(), v_trip_id) THEN
    RAISE EXCEPTION 'decision_vote_forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'decision_closed' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_current
  FROM public.decision_votes v
  WHERE v.decision_id = NEW.decision_id
    AND v.user_id = auth.uid();

  IF v_current >= v_max_choices THEN
    RAISE EXCEPTION 'decision_max_choices_reached' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_decision_vote_limit ON public.decision_votes;
CREATE TRIGGER enforce_decision_vote_limit
BEFORE INSERT ON public.decision_votes
FOR EACH ROW EXECUTE FUNCTION public.enforce_decision_vote_limit();

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can read decisions" ON public.decisions;
DROP POLICY IF EXISTS "Trip members can create decisions" ON public.decisions;
DROP POLICY IF EXISTS "Decision creators and organizers can update decisions" ON public.decisions;
DROP POLICY IF EXISTS "Decision creators and organizers can delete decisions" ON public.decisions;
CREATE POLICY "Trip members can read decisions"
ON public.decisions FOR SELECT TO authenticated
USING (public.is_trip_member(auth.uid(), trip_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Trip members can create decisions"
ON public.decisions FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Decision creators and organizers can update decisions"
ON public.decisions FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_trip_organizer(auth.uid(), trip_id)
  OR (created_by = auth.uid() AND public.is_trip_member(auth.uid(), trip_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_trip_organizer(auth.uid(), trip_id)
  OR (created_by = auth.uid() AND public.is_trip_member(auth.uid(), trip_id))
);
CREATE POLICY "Decision creators and organizers can delete decisions"
ON public.decisions FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_trip_organizer(auth.uid(), trip_id)
  OR (created_by = auth.uid() AND public.is_trip_member(auth.uid(), trip_id))
);

DROP POLICY IF EXISTS "Trip members can read decision options" ON public.decision_options;
DROP POLICY IF EXISTS "Decision managers can create options" ON public.decision_options;
DROP POLICY IF EXISTS "Decision managers can update options" ON public.decision_options;
DROP POLICY IF EXISTS "Decision managers can delete options" ON public.decision_options;
CREATE POLICY "Trip members can read decision options"
ON public.decision_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_id
      AND (public.is_trip_member(auth.uid(), d.trip_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);
CREATE POLICY "Decision managers can create options"
ON public.decision_options FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.is_trip_organizer(auth.uid(), d.trip_id)
        OR (d.created_by = auth.uid() AND public.is_trip_member(auth.uid(), d.trip_id))
      )
  )
);
CREATE POLICY "Decision managers can update options"
ON public.decision_options FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.is_trip_organizer(auth.uid(), d.trip_id)
        OR (d.created_by = auth.uid() AND public.is_trip_member(auth.uid(), d.trip_id))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.is_trip_organizer(auth.uid(), d.trip_id)
        OR (d.created_by = auth.uid() AND public.is_trip_member(auth.uid(), d.trip_id))
      )
  )
);
CREATE POLICY "Decision managers can delete options"
ON public.decision_options FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.is_trip_organizer(auth.uid(), d.trip_id)
        OR (d.created_by = auth.uid() AND public.is_trip_member(auth.uid(), d.trip_id))
      )
  )
);

DROP POLICY IF EXISTS "Trip members can read decision votes" ON public.decision_votes;
DROP POLICY IF EXISTS "Members can cast own votes" ON public.decision_votes;
DROP POLICY IF EXISTS "Members can remove own open votes" ON public.decision_votes;
CREATE POLICY "Trip members can read decision votes"
ON public.decision_votes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_id
      AND (public.is_trip_member(auth.uid(), d.trip_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);
CREATE POLICY "Members can cast own votes"
ON public.decision_votes FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_id
      AND d.status = 'open'
      AND public.is_trip_member(auth.uid(), d.trip_id)
  )
);
CREATE POLICY "Members can remove own open votes"
ON public.decision_votes FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.decisions d
    WHERE d.id = decision_id
      AND d.status = 'open'
      AND public.is_trip_member(auth.uid(), d.trip_id)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_options TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.decision_votes TO authenticated;

-- ---------------------------------------------------------------------------
-- Expenses: normalized UUID splits and atomic write API.
-- ---------------------------------------------------------------------------

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.expenses ALTER COLUMN paid_by DROP NOT NULL;

UPDATE public.expenses AS e
SET currency = COALESCE(tr.currency, 'EUR')
FROM public.trip AS tr
WHERE e.currency IS NULL AND e.trip_id = tr.id;

UPDATE public.expenses SET currency = 'EUR' WHERE currency IS NULL;
ALTER TABLE public.expenses ALTER COLUMN currency SET DEFAULT 'EUR';
ALTER TABLE public.expenses ALTER COLUMN currency SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_currency_check'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_currency_check CHECK (char_length(currency) = 3);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.expense_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS expense_splits_expense_id_idx ON public.expense_splits (expense_id);
CREATE INDEX IF NOT EXISTS expense_splits_user_id_idx ON public.expense_splits (user_id);

CREATE OR REPLACE FUNCTION public.enforce_expense_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.trip_id IS DISTINCT FROM OLD.trip_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'expense_identity_immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_expense_identity ON public.expenses;
CREATE TRIGGER enforce_expense_identity
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.enforce_expense_identity();

ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can read expense splits" ON public.expense_splits;
CREATE POLICY "Trip members can read expense splits"
ON public.expense_splits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id
      AND e.trip_id IS NOT NULL
      AND (public.is_trip_member(auth.uid(), e.trip_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

GRANT SELECT ON public.expense_splits TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.expense_splits FROM authenticated;
REVOKE INSERT, UPDATE ON public.expenses FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  p_trip_id uuid,
  p_description text,
  p_amount numeric,
  p_paid_by_user_id uuid,
  p_currency text,
  p_splits jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_expense_id uuid;
  v_total numeric;
  v_invalid integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_trip_member(v_user_id, p_trip_id) THEN
    RAISE EXCEPTION 'not_trip_member' USING ERRCODE = '42501';
  END IF;
  IF p_description IS NULL OR length(btrim(p_description)) = 0 THEN
    RAISE EXCEPTION 'expense_description_required' USING ERRCODE = '23514';
  END IF;
  IF p_currency IS NULL OR char_length(upper(p_currency)) <> 3 THEN
    RAISE EXCEPTION 'invalid_currency' USING ERRCODE = '23514';
  END IF;
  IF p_paid_by_user_id IS NULL OR NOT public.is_trip_member(p_paid_by_user_id, p_trip_id) THEN
    RAISE EXCEPTION 'invalid_payer' USING ERRCODE = '23514';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'invalid_expense_amount' USING ERRCODE = '23514';
  END IF;
  IF p_splits IS NULL OR jsonb_typeof(p_splits) <> 'array' OR jsonb_array_length(p_splits) = 0 THEN
    RAISE EXCEPTION 'expense_splits_required' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(sum(s.amount), 0), count(*) FILTER (
    WHERE s.amount < 0 OR NOT public.is_trip_member(s.user_id, p_trip_id)
  )
  INTO v_total, v_invalid
  FROM jsonb_to_recordset(p_splits) AS s(user_id uuid, amount numeric);

  IF v_invalid > 0 THEN
    RAISE EXCEPTION 'invalid_expense_split_member_or_amount' USING ERRCODE = '23514';
  END IF;
  IF v_total <> p_amount THEN
    RAISE EXCEPTION 'expense_split_total_mismatch' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.expenses (
    description, amount, paid_by, split_among, created_by, trip_id, paid_by_user_id, currency
  ) VALUES (
    btrim(p_description), p_amount, NULL, '{}'::text[], v_user_id, p_trip_id, p_paid_by_user_id, upper(p_currency)
  )
  RETURNING id INTO v_expense_id;

  INSERT INTO public.expense_splits (expense_id, user_id, amount)
  SELECT v_expense_id, s.user_id, s.amount
  FROM jsonb_to_recordset(p_splits) AS s(user_id uuid, amount numeric);

  RETURN v_expense_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_expense_with_splits(
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_paid_by_user_id uuid,
  p_currency text,
  p_splits jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
  v_created_by uuid;
  v_total numeric;
  v_invalid integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT e.trip_id, e.created_by
  INTO v_trip_id, v_created_by
  FROM public.expenses e
  WHERE e.id = p_expense_id;

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'expense_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    v_created_by = v_user_id
    OR public.is_trip_organizer(v_user_id, v_trip_id)
    OR public.has_role(v_user_id, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'expense_update_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_description IS NULL OR length(btrim(p_description)) = 0 THEN
    RAISE EXCEPTION 'expense_description_required' USING ERRCODE = '23514';
  END IF;
  IF p_currency IS NULL OR char_length(upper(p_currency)) <> 3 THEN
    RAISE EXCEPTION 'invalid_currency' USING ERRCODE = '23514';
  END IF;
  IF p_paid_by_user_id IS NULL OR NOT public.is_trip_member(p_paid_by_user_id, v_trip_id) THEN
    RAISE EXCEPTION 'invalid_payer' USING ERRCODE = '23514';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'invalid_expense_amount' USING ERRCODE = '23514';
  END IF;
  IF p_splits IS NULL OR jsonb_typeof(p_splits) <> 'array' OR jsonb_array_length(p_splits) = 0 THEN
    RAISE EXCEPTION 'expense_splits_required' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(sum(s.amount), 0), count(*) FILTER (
    WHERE s.amount < 0 OR NOT public.is_trip_member(s.user_id, v_trip_id)
  )
  INTO v_total, v_invalid
  FROM jsonb_to_recordset(p_splits) AS s(user_id uuid, amount numeric);

  IF v_invalid > 0 THEN
    RAISE EXCEPTION 'invalid_expense_split_member_or_amount' USING ERRCODE = '23514';
  END IF;
  IF v_total <> p_amount THEN
    RAISE EXCEPTION 'expense_split_total_mismatch' USING ERRCODE = '23514';
  END IF;

  UPDATE public.expenses
  SET description = btrim(p_description),
      amount = p_amount,
      paid_by_user_id = p_paid_by_user_id,
      currency = upper(p_currency),
      paid_by = NULL,
      split_among = '{}'::text[]
  WHERE id = p_expense_id;

  DELETE FROM public.expense_splits WHERE expense_id = p_expense_id;
  INSERT INTO public.expense_splits (expense_id, user_id, amount)
  SELECT p_expense_id, s.user_id, s.amount
  FROM jsonb_to_recordset(p_splits) AS s(user_id uuid, amount numeric);

  RETURN p_expense_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_expense_with_splits(uuid, text, numeric, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_expense_with_splits(uuid, text, numeric, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_expense_with_splits(uuid, text, numeric, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_expense_with_splits(uuid, text, numeric, uuid, text, jsonb) TO authenticated;
