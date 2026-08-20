import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSwitchKey =
  | "signups_open"
  | "hansie_enabled"
  | "payments_enabled"
  | "maintenance_mode"
  | "sandbox_pro_enabled";

export const PLATFORM_SWITCHES: Array<{ key: PlatformSwitchKey; label: string; description: string }> = [
  { key: "signups_open", label: "Registratie open", description: "Nieuwe bezoekers kunnen een account maken." },
  { key: "hansie_enabled", label: "Hansie actief", description: "Reizigers kunnen Hansie vragen stellen." },
  { key: "payments_enabled", label: "Pro en betalen actief", description: "Afrekenen en Pro-aankopen zijn beschikbaar." },
  { key: "maintenance_mode", label: "Onderhoudsmodus", description: "Toon een onderhoudsmelding in de app." },
  { key: "sandbox_pro_enabled", label: "Testbetalingen geven Pro", description: "Alleen gebruiken tijdens testen." },
];

export type PlatformSettings = Partial<Record<PlatformSwitchKey, boolean>>;

function toBooleans(raw: unknown): PlatformSettings {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const result: PlatformSettings = {};
  for (const item of PLATFORM_SWITCHES) {
    if (source[item.key] !== undefined) result[item.key] = String(source[item.key]) === "true";
  }
  return result;
}

/** Admin-only: full settings map. */
export async function listOpsSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase.rpc("ops_list_settings");
  if (error) throw error;
  return toBooleans(data);
}

export async function setOpsSetting(key: PlatformSwitchKey, value: boolean) {
  const { error } = await supabase.rpc("ops_set_setting", { p_key: key, p_value: value ? "true" : "false" });
  if (error) throw error;
}

/** Readable by everyone: the switches that gate customer-facing features. */
export function usePlatformSwitches() {
  const [switches, setSwitches] = useState<PlatformSettings>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["signups_open", "hansie_enabled", "payments_enabled", "maintenance_mode"]);
    const map: Record<string, string> = {};
    (data || []).forEach((row) => {
      map[row.key] = row.value;
    });
    setSwitches(toBooleans(map));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    loading,
    signupsOpen: switches.signups_open !== false,
    hansieEnabled: switches.hansie_enabled !== false,
    paymentsEnabled: switches.payments_enabled !== false,
    maintenanceMode: switches.maintenance_mode === true,
    refresh: load,
  };
}