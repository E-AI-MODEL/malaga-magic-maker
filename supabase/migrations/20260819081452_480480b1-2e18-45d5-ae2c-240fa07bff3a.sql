-- 1. Retire legacy permanent invite code mechanism
DROP TRIGGER IF EXISTS rotate_invite_code_on_member_removal ON public.trip_members;
DROP TRIGGER IF EXISTS trg_rotate_invite_code_on_member_removal ON public.trip_members;
DROP FUNCTION IF EXISTS public.rotate_invite_code_on_member_removal();
DROP FUNCTION IF EXISTS public.join_trip_by_code(text);
DROP FUNCTION IF EXISTS public.regenerate_trip_invite_code(uuid);
ALTER TABLE public.trip DROP COLUMN IF EXISTS invite_code;

-- 2. Internal-only SECURITY DEFINER helpers must not be callable through the Data API
REVOKE ALL ON FUNCTION public.notification_category_enabled(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_invites_for_user_deletion(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Invite preview requires an authenticated session
REVOKE ALL ON FUNCTION public.get_trip_invite_preview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trip_invite_preview(text) TO authenticated;