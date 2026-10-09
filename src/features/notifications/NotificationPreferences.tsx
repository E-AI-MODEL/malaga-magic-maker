import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotificationPreferences, saveNotificationPreferences } from "./data";

const options = [
  { key: "task_assignments" as const, label: "Taaktoewijzingen", description: "Als een taak aan jou wordt toegewezen of een relevante taak is afgerond." },
  { key: "decisions" as const, label: "Keuzes", description: "Als er een gezamenlijke keuze start of sluit." },
  { key: "trip_updates" as const, label: "Reiswijzigingen", description: "Bij belangrijke wijzigingen en wanneer een medereiziger aansluit." },
];

export function NotificationPreferences({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notification-preferences", userId],
    queryFn: () => getNotificationPreferences(userId),
  });

  const mutation = useMutation({
    mutationFn: (preferences: { task_assignments: boolean; decisions: boolean; trip_updates: boolean }) =>
      saveNotificationPreferences(userId, preferences),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-preferences", userId] }),
  });

  if (query.isLoading) return <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />;
  if (query.isError || !query.data) return <p className="text-sm text-destructive">Meldingsvoorkeuren konden niet worden geladen.</p>;

  const preferences = query.data;

  return (
    <section>
      <p className="text-xs leading-relaxed text-muted-foreground">Kies welke in-app meldingen je wilt ontvangen. Belangrijke account- en beveiligingsmeldingen staan hier los van.</p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {options.map((option, index) => (
          <label key={option.key} className={`flex cursor-pointer items-start gap-4 px-4 py-4 ${index > 0 ? "border-t border-border" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{option.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
            </div>
            <input
              type="checkbox"
              checked={preferences[option.key]}
              disabled={mutation.isPending}
              onChange={(event) => {
                void mutation.mutateAsync({
                  task_assignments: preferences.task_assignments,
                  decisions: preferences.decisions,
                  trip_updates: preferences.trip_updates,
                  [option.key]: event.target.checked,
                });
              }}
              className="mt-1 h-5 w-5 rounded border-border accent-primary"
              aria-label={option.label}
            />
          </label>
        ))}
      </div>
      {mutation.isError && <p className="mt-2 text-xs font-medium text-destructive">Opslaan is niet gelukt. Probeer het opnieuw.</p>}
    </section>
  );
}
