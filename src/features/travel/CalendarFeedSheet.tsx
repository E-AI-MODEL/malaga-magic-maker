import { useEffect, useState } from "react";
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
  const [activeSince, setActiveSince] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)("calendar_feeds")
      .select("created_at")
      .eq("trip_id", tripId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }: { data: { created_at: string }[] | null }) => setActiveSince(data?.[0]?.created_at ?? null));
  }, [open, tripId, token]);

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
    setActiveSince(null);
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
          <>
            {activeSince && (
              <p className="text-sm">
                Je hebt al een agenda-link sinds {new Date(activeSince).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}. Staat die al in je agenda, dan hoef je niets te doen.
              </p>
            )}
            <Button className="h-11 w-full" onClick={create} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
              {activeSince ? "Nieuwe link maken" : "Maak mijn agenda-link"}
            </Button>
            {activeSince && <p className="text-sm text-muted-foreground">Een nieuwe link zet de oude uit. Je moet hem dan opnieuw toevoegen in je agenda.</p>}
          </>
        )}
        <p className="text-sm text-muted-foreground">
          Dit is jouw persoonlijke link. Iedereen die hem heeft, ziet de planning van deze reis. Google werkt de agenda soms pas na een paar uur bij.
        </p>
        <Button variant="ghost" className="w-full" onClick={revoke} disabled={busy}>Link intrekken</Button>
      </div>
    </FormSheet>
  );
}
