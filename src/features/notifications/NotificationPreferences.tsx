import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotificationPreferences, saveNotificationPreferences } from "./data";

const options = [
  { key: "task_assignments" as const, label: "Taken", description: "Als een taak aan jou wordt toegewezen of een relevante taak wordt afgerond." },
  { key: "decisions" as const, label: "Keuzes", description: "Als een gezamenlijke keuze start of wordt gesloten." },
  { key: "trip_updates" as const, label: "Reiswijzigingen", description: "Bij belangrijke wijzigingen en wanneer iemand bij de reis aansluit." },
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

  if (query.isLoading) return <div className="h-36 animate-pulse rounded-2xl bg-secondary/40" />;
  if (query.isError || !query.data) return <p className="text-sm text-destructive">Meldingsvoorkeuren konden niet worden geladen.</p>;

  const preferences = query.data;

  return (
    <div className="divide-y divide-border/70 border-y border-border/70">
      {options.map((option) => (
        <label key={option.key} className="flex cursor-pointer items-center gap-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{option.label}</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">{option.description}</p>
          </div>
          <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
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
              className="peer sr-only"
              aria-label={option.label}
            />
            <span className="absolute inset-0 rounded-full bg-secondary transition-colors peer-checked:bg-primary peer-disabled:opacity-50" />
            <span className="absolute left-1 h-5 w-5 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      ))}
      {mutation.isError && <p className="py-3 text-xs font-medium text-destructive">Opslaan is niet gelukt. Probeer het opnieuw.</p>}
    </div>
  );
}
