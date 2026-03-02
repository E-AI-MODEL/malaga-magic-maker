import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useActivityLog() {
  const { user } = useAuth();
  const location = useLocation();
  const lastLog = useRef<{ page: string; time: number }>({ page: "", time: 0 });
  const pageEnteredAt = useRef<number>(Date.now());

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

  // Auto-log page views on route change (debounced) + session duration
  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    const page = location.pathname;

    // Log duration of previous page
    const prevPage = lastLog.current.page;
    if (prevPage && prevPage !== page) {
      const duration = Math.round((now - pageEnteredAt.current) / 1000);
      if (duration > 2 && duration < 3600) {
        logEvent("session_duration", prevPage, `${duration}s`);
      }
    }

    pageEnteredAt.current = now;

    if (page === lastLog.current.page && now - lastLog.current.time < 2000) return;
    lastLog.current = { page, time: now };
    logEvent("page_view", page);
  }, [location.pathname, user, logEvent]);

  return { logEvent };
}
