import { FormEvent, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormSelect, FormSheet, FormSubmit } from "@/components/FormSheet";
import type { TaskRow } from "@/integrations/supabase/database";
import { isoToLocalInput, localInputToIso } from "@/features/travel/presentation";
import { createTask, TripMemberView, updateTask } from "./data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  timezone: string;
  currentUserId: string;
  isOrganizer: boolean;
  members: TripMemberView[];
  task?: TaskRow | null;
  onSaved: () => void | Promise<void>;
};

export function TaskSheet({ open, onOpenChange, tripId, timezone, currentUserId, isOrganizer, members, task, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const allowedAssignees = useMemo(() => {
    if (isOrganizer) return members;
    return members.filter((member) => member.userId === currentUserId);
  }, [members, isOrganizer, currentUserId]);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setAssignedUserId(task?.assigned_user_id || "");
    setDueAt(isoToLocalInput(task?.due_at || null, timezone));
    setPriority(task?.priority || "normal");
    setError("");
  }, [open, task, timezone]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Geef de taak een korte naam.");
      return;
    }

    setSaving(true);
    try {
      if (task) {
        await updateTask(tripId, task.id, {
          title: title.trim(),
          description: description.trim() || null,
          assigned_user_id: assignedUserId || null,
          assigned_to: null,
          backup_user_id: null,
          backup_to: null,
          due_at: localInputToIso(dueAt, timezone),
          priority,
        });
      } else {
        await createTask({
          trip_id: tripId,
          title: title.trim(),
          description: description.trim() || null,
          created_by: currentUserId,
          assigned_user_id: assignedUserId || null,
          section: "general",
          due_at: localInputToIso(dueAt, timezone),
          priority,
          status: "open",
          progress: 0,
        });
      }
      await onSaved();
      onOpenChange(false);
    } catch (caught) {
      console.error("task save failed", caught);
      setError("Opslaan is niet gelukt. Controleer de taak en probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={task ? "Taak wijzigen" : "Nieuwe taak"}
      description="Wat moet er gebeuren, en wie doet het?"
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <FormField label="Taak" htmlFor="task-title" required>
          <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bijv. Huurauto reserveren" className="h-11" autoFocus />
        </FormField>

        <FormField label="Toelichting" htmlFor="task-description">
          <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Alleen wat nodig is om de taak uit te voeren" />
        </FormField>

        <FormField
          label="Wie pakt dit op?"
          htmlFor="task-assignee"
          hint={!isOrganizer ? "Als deelnemer kun je een nieuwe taak alleen aan jezelf toewijzen." : undefined}
        >
          <FormSelect
            id="task-assignee"
            value={assignedUserId}
            onChange={setAssignedUserId}
            options={[
              { value: "", label: "Nog niemand" },
              ...allowedAssignees.map((member) => ({ value: member.userId, label: member.displayName })),
            ]}
          />
        </FormField>

        <div className="grid grid-cols-[1fr_130px] gap-3">
          <FormField label="Wanneer nodig?" htmlFor="task-due">
            <Input id="task-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="h-11" />
          </FormField>
          <FormField label="Belang" htmlFor="task-priority">
            <FormSelect
              id="task-priority"
              value={priority}
              onChange={setPriority}
              options={[
                { value: "low", label: "Laag" },
                { value: "normal", label: "Normaal" },
                { value: "high", label: "Hoog" },
              ]}
            />
          </FormField>
        </div>

        <FormError message={error} />
        <FormSubmit saving={saving}>{task ? "Wijzigingen opslaan" : "Taak toevoegen"}</FormSubmit>
      </form>
    </FormSheet>
  );
}
