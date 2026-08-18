-- BUILD 10 live foundation: meaningful trip activity and in-app notifications.
-- This file restores source control for migration version 20260818110000,
-- already applied in production. A later forward migration removes legacy
-- notification policies that remained from the prototype era.

CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trip(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_trip_created_idx
ON public.activity_events(trip_id, created_at DESC);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_events FROM anon, authenticated;
GRANT SELECT ON public.activity_events TO authenticated;

DROP POLICY IF EXISTS "Trip members can read activity" ON public.activity_events;
CREATE POLICY "Trip members can read activity"
ON public.activity_events FOR SELECT TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_id text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "Users can read own trip notifications" ON public.notifications;
CREATE POLICY "Users can read own trip notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND (trip_id IS NULL OR public.is_trip_member(auth.uid(), trip_id))
);

DROP POLICY IF EXISTS "Users can update own trip notifications" ON public.notifications;
CREATE POLICY "Users can update own trip notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND (trip_id IS NULL OR public.is_trip_member(auth.uid(), trip_id))
)
WITH CHECK (
  user_id = auth.uid()
  AND (trip_id IS NULL OR public.is_trip_member(auth.uid(), trip_id))
);

DROP POLICY IF EXISTS "Trip members can insert notifications" ON public.notifications;
CREATE POLICY "Trip members can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  from_user_id = auth.uid()
  AND trip_id IS NOT NULL
  AND public.is_trip_member(auth.uid(), trip_id)
  AND public.is_trip_member(user_id, trip_id)
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  task_assignments boolean NOT NULL DEFAULT true,
  decisions boolean NOT NULL DEFAULT true,
  trip_updates boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can read own notification preferences"
ON public.notification_preferences FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can create own notification preferences"
ON public.notification_preferences FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
ON public.notification_preferences FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notification_category_enabled(p_user_id uuid, p_category text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_category
    WHEN 'task_assignments' THEN COALESCE((SELECT task_assignments FROM public.notification_preferences WHERE user_id=p_user_id), true)
    WHEN 'decisions' THEN COALESCE((SELECT decisions FROM public.notification_preferences WHERE user_id=p_user_id), true)
    WHEN 'trip_updates' THEN COALESCE((SELECT trip_updates FROM public.notification_preferences WHERE user_id=p_user_id), true)
    ELSE true
  END;
$$;

CREATE OR REPLACE FUNCTION public.emit_trip_activity(
  p_trip_id uuid,
  p_actor uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.activity_events(trip_id,actor_user_id,event_type,entity_type,entity_id,message,metadata)
  VALUES(p_trip_id,p_actor,p_event_type,p_entity_type,p_entity_id,p_message,COALESCE(p_metadata,'{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_user_notification(
  p_user_id uuid,
  p_trip_id uuid,
  p_actor uuid,
  p_event_type text,
  p_category text,
  p_entity_type text,
  p_entity_id text,
  p_message text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id = p_actor OR NOT public.notification_category_enabled(p_user_id,p_category) THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications(user_id,from_user_id,message,read,trip_id,event_type,entity_type,entity_id,payload)
  VALUES(p_user_id,p_actor,p_message,false,p_trip_id,p_event_type,p_entity_type,p_entity_id,COALESCE(p_payload,'{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.notification_category_enabled(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.emit_trip_activity(uuid,uuid,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.emit_user_notification(uuid,uuid,uuid,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notification_category_enabled(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.emit_trip_activity(uuid,uuid,text,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.emit_user_notification(uuid,uuid,uuid,text,text,text,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.on_task_activity_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid:=COALESCE(auth.uid(),NEW.created_by); v_completed_old boolean; v_completed_new boolean;
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.emit_trip_activity(NEW.trip_id,v_actor,'task.created','task',NEW.id::text,'Taak toegevoegd',jsonb_build_object('title',NEW.title));
    IF NEW.assigned_user_id IS NOT NULL THEN
      PERFORM public.emit_user_notification(NEW.assigned_user_id,NEW.trip_id,v_actor,'task.assigned','task_assignments','task',NEW.id::text,'Er is een taak aan je toegewezen',jsonb_build_object('title',NEW.title));
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id AND NEW.assigned_user_id IS NOT NULL THEN
    PERFORM public.emit_user_notification(NEW.assigned_user_id,NEW.trip_id,v_actor,'task.assigned','task_assignments','task',NEW.id::text,'Er is een taak aan je toegewezen',jsonb_build_object('title',NEW.title));
  END IF;
  v_completed_old := OLD.status='done' OR COALESCE(OLD.progress,0)>=100;
  v_completed_new := NEW.status='done' OR COALESCE(NEW.progress,0)>=100;
  IF NOT v_completed_old AND v_completed_new THEN
    PERFORM public.emit_trip_activity(NEW.trip_id,v_actor,'task.completed','task',NEW.id::text,'Taak afgerond',jsonb_build_object('title',NEW.title));
    IF NEW.created_by IS NOT NULL THEN
      PERFORM public.emit_user_notification(NEW.created_by,NEW.trip_id,v_actor,'task.completed','task_assignments','task',NEW.id::text,'Een taak is afgerond',jsonb_build_object('title',NEW.title));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_decision_activity_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid:=COALESCE(auth.uid(),NEW.created_by); r record;
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.emit_trip_activity(NEW.trip_id,v_actor,'decision.created','decision',NEW.id::text,'Nieuwe keuze gestart',jsonb_build_object('title',NEW.title));
    FOR r IN SELECT user_id FROM public.trip_members WHERE trip_id=NEW.trip_id LOOP
      PERFORM public.emit_user_notification(r.user_id,NEW.trip_id,v_actor,'decision.created','decisions','decision',NEW.id::text,'Er staat een nieuwe keuze klaar',jsonb_build_object('title',NEW.title));
    END LOOP;
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status='closed' THEN
    PERFORM public.emit_trip_activity(NEW.trip_id,v_actor,'decision.closed','decision',NEW.id::text,'Keuze gesloten',jsonb_build_object('title',NEW.title));
    FOR r IN SELECT user_id FROM public.trip_members WHERE trip_id=NEW.trip_id LOOP
      PERFORM public.emit_user_notification(r.user_id,NEW.trip_id,v_actor,'decision.closed','decisions','decision',NEW.id::text,'Een keuze is gesloten',jsonb_build_object('title',NEW.title));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_trip_details_activity_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid:=auth.uid(); r record; v_changed boolean;
BEGIN
  v_changed := NEW.name IS DISTINCT FROM OLD.name OR NEW.destination_name IS DISTINCT FROM OLD.destination_name OR NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date;
  IF NOT v_changed THEN RETURN NEW; END IF;
  PERFORM public.emit_trip_activity(NEW.id,v_actor,'trip.updated','trip',NEW.id::text,'Reisgegevens gewijzigd','{}'::jsonb);
  FOR r IN SELECT user_id FROM public.trip_members WHERE trip_id=NEW.id LOOP
    PERFORM public.emit_user_notification(r.user_id,NEW.id,v_actor,'trip.updated','trip_updates','trip',NEW.id::text,'De reisgegevens zijn gewijzigd','{}'::jsonb);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_invite_use_activity_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_trip_id uuid; v_name text; r record;
BEGIN
  SELECT trip_id INTO v_trip_id FROM public.trip_invites WHERE id=NEW.invite_id;
  SELECT display_name INTO v_name FROM public.profiles WHERE id=NEW.user_id;
  IF v_trip_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.emit_trip_activity(v_trip_id,NEW.user_id,'member.joined','trip_member',NEW.user_id::text,'Medereiziger toegevoegd',jsonb_build_object('display_name',v_name));
  FOR r IN SELECT user_id FROM public.trip_members WHERE trip_id=v_trip_id AND role='organizer' LOOP
    PERFORM public.emit_user_notification(r.user_id,v_trip_id,NEW.user_id,'member.joined','trip_updates','trip_member',NEW.user_id::text,'Een medereiziger heeft de uitnodiging geaccepteerd',jsonb_build_object('display_name',v_name));
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_activity_notification ON public.tasks;
CREATE TRIGGER task_activity_notification AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.on_task_activity_notification();

DROP TRIGGER IF EXISTS decision_activity_notification ON public.decisions;
CREATE TRIGGER decision_activity_notification AFTER INSERT OR UPDATE ON public.decisions
FOR EACH ROW EXECUTE FUNCTION public.on_decision_activity_notification();

DROP TRIGGER IF EXISTS trip_details_activity_notification ON public.trip;
CREATE TRIGGER trip_details_activity_notification AFTER UPDATE ON public.trip
FOR EACH ROW EXECUTE FUNCTION public.on_trip_details_activity_notification();

DROP TRIGGER IF EXISTS invite_use_activity_notification ON public.trip_invite_uses;
CREATE TRIGGER invite_use_activity_notification AFTER INSERT ON public.trip_invite_uses
FOR EACH ROW EXECUTE FUNCTION public.on_invite_use_activity_notification();
