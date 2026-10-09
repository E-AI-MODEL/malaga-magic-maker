import { useState } from "react";
import { CalendarPlus, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/FormSheet";
import { calendarLinks } from "./calendar-links";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; tripId: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args: Record<string, unknown>) => (supabase.rpc as any)(name, args);

/** Personal calendar subscription link for one trip. The token is shown once; revoking makes it invalid. */
export function CalendarFeedSheet({ open, onOpenChange, tripId }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const links = token ? calendarLinks(import.meta.env.VITE_SUPABASE_PROJECT_ID, token) : null;

  const create = async () => {
    setBusy(true);
    const { data, error } = await rpc("create_calendar_feed", { p_trip_id: tripId });
    setBusy(false);
    if (error || typeof data !== "string") return toast.error("De link maken lukte niet. Probeer het zo nog eens.");
    setToken(data);
  };

  const revoke = async () => {
    setBusy(true);
    const { error } = await rpc("revoke_calendar_feed", { p_trip_id: tripId });
    setBusy(false);
    if (error) return toast.error("Intrekken lukte niet. Probeer het zo nog eens.");
    setToken(null);
    toast.success("De oude link werkt niet meer.");
  };

  const copy = async () => {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.https);
      toast.success("Link gekopieerd.");
    } catch {
      toast.error("Kopiëren lukte niet.");
    }
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Zet in je agenda" description="Je planning verschijnt in je eigen agenda en blijft vanzelf bijgewerkt.">
      <div className="mt-5 space-y-3">
        {links ? (
          <>
            <Button asChild className="h-11 w-full"><a href={links.webcal}>Apple Agenda</a></Button>
            <Button asChild variant="outline" className="h-11 w-full"><a href={links.google} target="_blank" rel="noreferrer">Google Agenda</a></Button>
            <Button variant="outline" className="h-11 w-full" onClick={copy}><Copy className="mr-2 h-4 w-4" />Link kopiëren</Button>
          </>
        ) : (
          <Button className="h-11 w-full" onClick={create} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}Maak mijn agenda-link
          </Button>
        )}
        <p className="text-sm text-muted-foreground">
          Dit is jouw persoonlijke link. Iedereen die hem heeft, ziet de planning van deze reis. Google werkt de agenda soms pas na een paar uur bij.
        </p>
        <Button variant="ghost" className="w-full" onClick={revoke} disabled={busy}>Link intrekken</Button>
      </div>
    </FormSheet>
  );
}
