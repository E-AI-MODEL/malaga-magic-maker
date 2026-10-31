import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, CalendarOff, Plane, Sun, UserRound, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StepChip, StepError, StepNext, StepQuestion, StepSheet, StepSummary, StepTile, useStepFlow } from "@/components/steps";
import { localInputToIso } from "@/features/travel/presentation";
import { createTask, type TripMemberView } from "./data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  timezone: string;
  startDate: string | null;
  currentUserId: string;
  isOrganizer: boolean;
  members: TripMemberView[];
  onSaved: () => void | Promise<void>;
};

type Step = "what" | "who" | "when" | "summary";
const SUGGESTIONS = ["Paspoort of ID checken", "Vervoer regelen", "Verblijf boeken", "Reisverzekering regelen", "Inpakken", "Boodschappen doen"];

const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Quick deadline choices; "before departure" only while the start date is still ahead. */
export function taskDueChoices(today: Date, startDate: string | null) {
  const sunday = new Date(today); sunday.setDate(today.getDate() + ((7 - today.getDay()) % 7));
  const choices: Array<{ key: string; label: string; day: string | null }> = [
    { key: "today", label: "Vandaag", day: isoDay(today) },
    { key: "week", label: "Deze week", day: isoDay(sunday) },
  ];
  if (startDate) {
    const before = new Date(`${startDate}T12:00:00`); before.setDate(before.getDate() - 1);
    if (isoDay(before) >= isoDay(today)) choices.push({ key: "departure", label: "Voor vertrek", day: isoDay(before) });
  }
  choices.push({ key: "none", label: "Geen datum", day: null });
  return choices;
}

export function TaskWizard({ open, onOpenChange, tripId, timezone, startDate, currentUserId, isOrganizer, members, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const solo = members.length <= 1;
  const steps: Step[] = solo ? ["what", "when", "summary"] : ["what", "who", "when", "summary"];
  const flow = useStepFlow<Step>(steps, { what: Boolean(title.trim()) }, "summary");
  const choices = taskDueChoices(new Date(), startDate);
  const people = isOrganizer ? members : members.filter((m) => m.userId === currentUserId);
  const name = (id: string) => (id === currentUserId ? "Ik" : members.find((m) => m.userId === id)?.displayName || "Iemand");

  useEffect(() => {
    if (!open) return;
    setTitle(""); setAssignee(solo ? currentUserId : ""); setDue(null); setError(""); setSaving(false); flow.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    if (saving || !flow.complete) return;
    setSaving(true); setError("");
    try {
      await createTask({
        trip_id: tripId, title: title.trim(), description: null, created_by: currentUserId,
        assigned_user_id: assignee || null, section: "general",
        due_at: due ? localInputToIso(`${due}T18:00`, timezone) : null,
        priority: "normal", status: "open", progress: 0,
      });
      await onSaved();
      onOpenChange(false);
    } catch { setError("Opslaan lukte niet. Probeer het opnieuw."); }
    finally { setSaving(false); }
  };
  const dueLabel = due ? choices.find((c) => c.day === due && c.day)?.label || new Date(`${due}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long" }) : "Geen datum";

  return (
    <StepSheet open={open} onOpenChange={onOpenChange} title="Nieuwe taak" total={steps.length} index={flow.index} onBack={flow.back} onSwipeNext={flow.step !== "summary" ? flow.next : undefined}>
      {flow.step === "what" && <form onSubmit={(e: FormEvent) => { e.preventDefault(); flow.next(); }}>
        <StepQuestion>Wat moet er gebeuren?</StepQuestion>
        <Input aria-label="Taak" autoFocus value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="Bijvoorbeeld huurauto reserveren" className="h-16 rounded-2xl text-xl" />
        <div className="mt-4 flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <StepChip key={s} selected={title === s} onClick={() => { setTitle(s); flow.go(flow.backToSummary ? "summary" : steps[1]); }}>{s}</StepChip>)}</div>
        <StepNext disabled={!title.trim()}>{flow.backToSummary ? "Klaar" : "Volgende"}</StepNext>
      </form>}

      {flow.step === "who" && <div className="space-y-3">
        <StepQuestion sub={!isOrganizer ? "Je kunt een nieuwe taak aan jezelf geven of open laten." : undefined}>Wie pakt het op?</StepQuestion>
        {people.map((m) => <StepTile key={m.userId} selected={assignee === m.userId} icon={<UserRound />} onClick={() => { setAssignee(m.userId); flow.go(flow.backToSummary ? "summary" : "when"); }}>{m.userId === currentUserId ? "Ik doe het" : m.displayName}</StepTile>)}
        <StepTile selected={assignee === ""} icon={<Users />} onClick={() => { setAssignee(""); flow.go(flow.backToSummary ? "summary" : "when"); }}>Nog niemand</StepTile>
      </div>}

      {flow.step === "when" && <div className="space-y-3">
        <StepQuestion>Wanneer moet het klaar zijn?</StepQuestion>
        {choices.map((c) => <StepTile key={c.key} selected={due === c.day} icon={c.key === "today" ? <Sun /> : c.key === "departure" ? <Plane /> : c.key === "none" ? <CalendarOff /> : <CalendarDays />} onClick={() => { setDue(c.day); flow.go("summary"); }}>{c.label}</StepTile>)}
        <label className="block pt-2"><span className="text-sm font-semibold text-muted-foreground">Of kies een datum</span>
          <Input type="date" value={due || ""} onChange={(e) => setDue(e.target.value || null)} className="mt-2 h-14 rounded-2xl text-lg" /></label>
        {due && !choices.some((c) => c.day === due) && <StepNext onClick={() => flow.go("summary")}>Volgende</StepNext>}
      </div>}

      {flow.step === "summary" && <div className="space-y-5">
        <StepQuestion>Klopt dit?</StepQuestion>
        <StepSummary rows={[
          { label: "Taak", value: title, onEdit: () => flow.edit("what") },
          ...(solo ? [] : [{ label: "Wie", value: assignee ? (assignee === currentUserId ? "Ik" : name(assignee)) : "Nog niemand", onEdit: () => flow.edit("who") }]),
          { label: "Klaar op", value: dueLabel, onEdit: () => flow.edit("when") },
        ]} />
        <StepNext onClick={() => void save()} busy={saving} disabled={!flow.complete} done>Taak toevoegen</StepNext>
      </div>}
      <StepError message={error} />
    </StepSheet>
  );
}
