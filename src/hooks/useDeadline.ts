import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DeadlineState {
  deadline: Date | null;
  isPastDeadline: boolean;
  timeRemaining: string;
  loading: boolean;
}

export function useDeadline(): DeadlineState {
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchDeadline = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "intake_deadline")
      .single();
    if (data) {
      setDeadline(new Date(data.value));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDeadline();
    // Poll every 30s for admin changes
    const poll = setInterval(fetchDeadline, 30_000);
    // Tick every second for countdown
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const isPastDeadline = deadline ? now >= deadline : false;

  const timeRemaining = (() => {
    if (!deadline) return "";
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) return "Verlopen";
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1000);
    if (days > 0) return `${days}d ${hours}u ${minutes}m`;
    if (hours > 0) return `${hours}u ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  })();

  return { deadline, isPastDeadline, timeRemaining, loading };
}
