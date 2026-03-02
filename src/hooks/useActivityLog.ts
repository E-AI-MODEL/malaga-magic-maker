import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useActivityLog() {
  const { user } = useAuth();
  const location = useLocation();
  const lastLog = useRef<{ page: string; time: number }>({ page: "", time: 0 });

  const logEvent = useCallback(
    async (eventType: string, page: string, detail?: string) => {
      if (!user) return;
      await supabase.from("activity_log").insert({
        user_id: user.id,
        event_type: eventType,
        page,
        detail: detail || null,
      });
    },
    [user]
  );

  // Auto-log page views on route change (debounced)
  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    const page = location.pathname;
    if (page === lastLog.current.page && now - lastLog.current.time < 2000) return;
    lastLog.current = { page, time: now };
    logEvent("page_view", page);
  }, [location.pathname, user, logEvent]);

  return { logEvent };
}
