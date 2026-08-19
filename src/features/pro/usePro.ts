import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";

export interface ProStatus {
  isPro: boolean;
  loading: boolean;
  grantedAt: string | null;
  refresh: () => Promise<void>;
}

export function usePro(): ProStatus {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [grantedAt, setGrantedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !paymentsConfigured()) {
      setIsPro(false);
      setGrantedAt(null);
      setLoading(false);
      return;
    }

    // Sandbox and live entitlements share one table; always scope the read.
    const { data } = await supabase
      .from("entitlements")
      .select("granted_at, expires_at")
      .eq("user_id", user.id)
      .eq("environment", getStripeEnvironment())
      .order("granted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const active = Boolean(data && (!data.expires_at || new Date(data.expires_at) > new Date()));
    setIsPro(active);
    setGrantedAt(active ? (data?.granted_at ?? null) : null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`entitlements-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entitlements", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  return { isPro, loading, grantedAt, refresh: load };
}
