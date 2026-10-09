import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotificationPreferences, saveNotificationPreferences } from "./data";
import { currentDeviceSubscribed, currentPushSupport, disablePushOnThisDevice, enablePushOnThisDevice, showTestNotification } from "@/features/push/data";

const IOS_TEXT = "Op iPhone werken meldingen pas als je Vakansie op je beginscherm zet: tik op Deel → Zet op beginscherm, open Vakansie daarvandaan en zet dit dan aan. Tot die tijd krijg je herinneringen per e-mail.";

export function ReminderPreferences({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const support = currentPushSupport();
  const [deviceOn, setDeviceOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["notification-preferences", userId], queryFn: () => getNotificationPreferences(userId) });

  useEffect(() => { void currentDeviceSubscribed().then(setDeviceOn).catch(() => setDeviceOn(false)); }, []);

  const save = useMutation({
    mutationFn: (patch: { push_reminders?: boolean; email_reminders?: boolean }) => saveNotificationPreferences(userId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-preferences", userId] }),
  });

  if (!query.data) return null;
  const prefs = query.data;

  const togglePush = async (on: boolean) => {
    setBusy(true); setMessage(null);
    try {
      if (on) {
        const result = await enablePushOnThisDevice(userId);
        if (result === "denied") setMessage("Je hebt meldingen niet toegestaan. Dat pas je aan in de instellingen van je browser.");
        else if (result === "unavailable") setMessage("Pushmeldingen lukken nu niet. Probeer het later opnieuw.");
        else { setDeviceOn(true); await save.mutateAsync({ push_reminders: true }); }
      } else {
        await disablePushOnThisDevice();
        setDeviceOn(false);
      }
    } catch {
      setMessage("Pushmeldingen lukken nu niet. Probeer het later opnieuw.");
    } finally { setBusy(false); }
  };

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-muted-foreground">Herinneringen</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Vertrek, inchecken, keuzes en taken die eraan komen. Hooguit drie per dag, niet tussen 22:00 en 08:00.</p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {support === "ios_needs_home_screen" ? (
          <p className="px-4 py-4 text-sm leading-relaxed">{IOS_TEXT}</p>
        ) : support === "supported" ? (
          <label className="flex cursor-pointer items-start gap-4 px-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Pushmeldingen op dit apparaat</p>
              <p className="mt-1 text-xs text-muted-foreground">Je browser vraagt pas om toestemming als je dit aanzet.</p>
            </div>
            <input type="checkbox" checked={deviceOn && prefs.push_reminders} disabled={busy}
              onChange={(e) => void togglePush(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-border accent-primary" aria-label="Pushmeldingen op dit apparaat" />
          </label>
        ) : (
          <p className="px-4 py-4 text-sm text-muted-foreground">Deze browser ondersteunt geen pushmeldingen. Je krijgt herinneringen per e-mail.</p>
        )}
        <label className="flex cursor-pointer items-start gap-4 border-t border-border px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Herinneringen per e-mail</p>
            <p className="mt-1 text-xs text-muted-foreground">Alleen als een pushmelding niet aankomt.</p>
          </div>
          <input type="checkbox" checked={prefs.email_reminders} disabled={save.isPending}
            onChange={(e) => void save.mutateAsync({ email_reminders: e.target.checked })}
            className="mt-1 h-5 w-5 rounded border-border accent-primary" aria-label="Herinneringen per e-mail" />
        </label>
        {support === "supported" && deviceOn && (
          <div className="border-t border-border px-4 py-3">
            <button type="button" className="text-sm font-semibold underline-offset-4 hover:underline"
              onClick={() => void showTestNotification().then(() => setMessage("Testmelding verstuurd naar dit apparaat.")).catch(() => setMessage("De testmelding lukte niet."))}>
              Stuur testmelding
            </button>
          </div>
        )}
      </div>
      {(message || save.isError) && <p className="mt-2 text-xs font-medium text-muted-foreground">{message || "Opslaan is niet gelukt. Probeer het opnieuw."}</p>}
    </section>
  );
}
