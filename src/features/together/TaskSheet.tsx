import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-5 pb-8 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl font-extrabold">{task ? "Taak wijzigen" : "Nieuwe taak"}</SheetTitle>
          <SheetDescription>Maak duidelijk wat nog moet gebeuren en wie het oppakt.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-semibold" htmlFor="task-title">Taak *</label>
            <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bijv. Huurauto reserveren" className="mt-2 h-11" autoFocus />
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="task-description">Toelichting</label>
            <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-2" placeholder="Alleen wat nodig is om de taak uit te voeren" />
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="task-assignee">Wie pakt dit op?</label>
            <select id="task-assignee" value={assignedUserId} onChange={(event) => setAssignedUserId(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Nog niemand</option>
              {allowedAssignees.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}
            </select>
            {!isOrganizer && <p className="mt-1 text-xs text-muted-foreground">Als deelnemer kun je een nieuwe taak alleen aan jezelf toewijzen.</p>}
          </div>

          <div className="grid grid-cols-[1fr_130px] gap-3">
            <div>
              <label className="text-sm font-semibold" htmlFor="task-due">Wanneer nodig?</label>
              <Input id="task-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-2 h-11" />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="task-priority">Belang</label>
              <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="low">Laag</option>
                <option value="normal">Normaal</option>
                <option value="high">Hoog</option>
              </select>
            </div>
          </div>

          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full font-bold" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {task ? "Wijzigingen opslaan" : "Taak toevoegen"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
