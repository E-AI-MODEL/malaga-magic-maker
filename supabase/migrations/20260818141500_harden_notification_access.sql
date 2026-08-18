-- BUILD 10 hardening: remove prototype notification access paths.
-- Product notifications are emitted by trusted trigger/helper functions.

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Trip members can insert notifications" ON public.notifications;

REVOKE INSERT ON public.notifications FROM authenticated;
