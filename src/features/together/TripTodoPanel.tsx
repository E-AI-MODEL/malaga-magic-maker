import { decisionStatusLine, decisionsLiveLine, displayDecisionTitle, samenHeadline, tasksLiveLine } from "@/features/together/labels";
import { ACCOMMODATION_DECISION_TITLE, finalizeAccommodationChoice, selectedStayOption } from "@/features/travel/accommodation";
import { listTripItems } from "@/features/travel/data";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CalendarDays,
  ListChecks,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Plus,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { formatTripDateTime } from "@/features/travel/presentation";
import type { TaskRow } from "@/integrations/supabase/database";
import {
  deleteDecision,
  deleteTask,
  type DecisionBundle,
  listDecisions,
  listExpenses,
  listTasks,
  listTripMembers,
  setDecisionStatus,
  setDecisionVote,
  updateTask,
} from "@/features/together/data";
import { TaskSheet } from "@/features/together/TaskSheet";
import { DecisionWizard } from "@/features/together/DecisionWizard";
import { TaskWizard } from "@/features/together/TaskWizard";
import { TripInvitesCard } from "@/features/invites/TripInvitesCard";
import { listTravelerProfiles, summariseProfile } from "@/features/travelers/data";
import { TravelerProfileSheet } from "@/features/travelers/TravelerProfileSheet";
import { EmptyLine, RowList } from "@/components/primitives";

export type ReisTab = "planning" | "todo";

/** Open tasks plus open decisions still waiting for this user's vote; each item counts once. */
export function todoCount(tasks: Array<{ status: string; progress: number }>, decisions: Array<{ status: string; options: Array<{ votes: Array<{ user_id: string }> }> }>, userId: string) {
  const openTasks = tasks.filter((t) => t.status !== "done" && t.progress < 100).length;
  const myVotes = decisions.filter((d) => d.status === "open" && !d.options.some((o) => o.votes.some((v) => v.user_id === userId))).length;
  return openTasks + myVotes;
}

/** Reis workspace: travellers, Planning/Te doen switch and the shared tasks and decisions. */
export function TripTodoPanel({ planning }: { planning: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const { activeTrip, isOrganizer } = useTrip();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: ReisTab = searchParams.get("tab") === "todo" ? "todo" : "planning";
  const setTab = (next: ReisTab) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (next === "todo") params.set("tab", "todo"); else params.delete("tab");
      return params;
    }, { replace: true });
  };
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [taskWizardOpen, setTaskWizardOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [decisionSheetOpen, setDecisionSheetOpen] = useState(false);
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [allMembersOpen, setAllMembersOpen] = useState(false);

  const tripId = activeTrip?.id || "";
  const timezone = activeTrip?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam";
  const readOnly = activeTrip?.status === "archived";

  const membersQuery = useQuery({
    queryKey: ["trip-members-view", tripId],
    queryFn: () => listTripMembers(tripId),
    enabled: Boolean(tripId),
  });
  const tasksQuery = useQuery({
    queryKey: ["together-tasks", tripId],
    queryFn: () => listTasks(tripId),
    enabled: Boolean(tripId),
  });
  const decisionsQuery = useQuery({
    queryKey: ["together-decisions", tripId],
    queryFn: () => listDecisions(tripId),
    enabled: Boolean(tripId),
  });
  const itemsQuery = useQuery({ queryKey: ["trip-items", tripId], queryFn: () => listTripItems(tripId), enabled: Boolean(tripId) });
  const expensesQuery = useQuery({
    queryKey: ["together-expenses", tripId],
    queryFn: () => listExpenses(tripId),
    enabled: Boolean(tripId),
  });
  const profilesQuery = useQuery({
    queryKey: ["trip-traveler-profiles", tripId],
    queryFn: () => listTravelerProfiles(tripId),
    enabled: Boolean(tripId),
  });

  const members = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const profileMapByUser = useMemo(
    () => new Map((profilesQuery.data || []).map((profile) => [profile.user_id, profile])),
    [profilesQuery.data],
  );
  const myProfile = user ? profileMapByUser.get(user.id) : undefined;
  const refreshProfiles = () => queryClient.invalidateQueries({ queryKey: ["trip-traveler-profiles", tripId] });
  const memberMap = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const tasks = tasksQuery.data || [];
  const decisions = decisionsQuery.data || [];
  if (!activeTrip || !user) return null;

  const refreshTasks = () => queryClient.invalidateQueries({ queryKey: ["together-tasks", activeTrip.id] });
  const refreshDecisions = () => queryClient.invalidateQueries({ queryKey: ["together-decisions", activeTrip.id] });

  const openNewTask = () => {
    setEditingTask(null);
    setTaskWizardOpen(true);
  };
  const openTaskEdit = (task: TaskRow) => {
    setEditingTask(task);
    setTaskSheetOpen(true);
  };
  const toggleTask = async (task: TaskRow) => {
    setActionError("");
    const completed = task.status === "done" || task.progress >= 100;
    try {
      await updateTask(activeTrip.id, task.id, {
        status: completed ? "open" : "done",
        progress: completed ? 0 : 100,
      });
      await refreshTasks();
    } catch (error) {
      console.error("task status update failed", error);
      setActionError("De taakstatus kon niet worden aangepast.");
    }
  };

  const removeTask = async (task: TaskRow) => {
    if (!window.confirm(`'${task.title}' verwijderen?`)) return;
    try {
      await deleteTask(activeTrip.id, task.id);
      await refreshTasks();
    } catch (error) {
      console.error("task delete failed", error);
      setActionError("De taak kon niet worden verwijderd.");
    }
  };

  const voteFor = async (decision: DecisionBundle, optionId: string) => {
    setActionError("");
    try {
      await setDecisionVote(decision.id, optionId);
      await refreshDecisions();
    } catch (error) {
      console.error("decision vote failed", error);
      setActionError("Je stem kon niet worden opgeslagen.");
    }
  };

  const finalizeStay = async (decision: DecisionBundle, option: DecisionBundle["options"][number]) => {
    if (finalizing || !window.confirm(`${option.label} definitief kiezen?`)) return;
    setActionError("");
    setFinalizing(true);
    try {
      await finalizeAccommodationChoice(decision.id, option.id);
      await queryClient.invalidateQueries();
      toast.success(`Het wordt ${option.label}!`);
    } catch (error) {
      console.error("finalize stay failed", error);
      setActionError("Kiezen lukte niet. Probeer het opnieuw.");
    } finally {
      setFinalizing(false);
    }
  };

  const toggleDecisionClosed = async (decision: DecisionBundle) => {
    try {
      await setDecisionStatus(decision.id, decision.status === "open" ? "closed" : "open");
      await refreshDecisions();
    } catch (error) {
      console.error("decision status failed", error);
      setActionError("De keuze kon niet worden aangepast.");
    }
  };

  const removeDecision = async (decision: DecisionBundle) => {
    if (!window.confirm(`Keuze '${decision.title}' verwijderen?`)) return;
    try {
      await deleteDecision(decision.id);
      await refreshDecisions();
    } catch (error) {
      console.error("decision delete failed", error);
      setActionError("De keuze kon niet worden verwijderd.");
    }
  };

  const openTasks = tasks.filter((task) => task.status !== "done" && task.progress < 100);
  const openDecisions = decisions.filter((decision) => decision.status === "open");

  const nameOf = (id: string | null | undefined) => (id ? memberMap.get(id)?.displayName || null : null);
  const expenses = expensesQuery.data || [];
  const tasksLine = tasksLiveLine({ tasks, userId: user.id, nameOf });
  const decisionsLine = decisionsLiveLine({ decisions, userId: user.id, memberCount: members.length, nameOf });
  const count = todoCount(tasks, decisions, user.id);
  const waitingForMe = openDecisions.some((d) => !d.options.some((o) => o.votes.some((v) => v.user_id === user.id)));
  const headline = samenHeadline({
    tasksDone: tasks.length > 0 && openTasks.length === 0,
    decisionsDone: decisions.length > 0 && openDecisions.length === 0,
    waitingForMe,
    hasAnything: tasks.length + decisions.length + expenses.length > 0,
  });

  return (
    <>
      <div>
        {readOnly && (
          <div className="mt-4 flex items-center gap-2 border-t border-rule/10 pt-3 text-sm text-muted-foreground">
            <Archive className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            Deze reis staat in het archief en is alleen-lezen.
          </div>
        )}

        <section className="mt-4">
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0" aria-label="Reizigers">
            {membersQuery.isLoading ? <LoadingRows /> : [...members].sort((a, b) => Number(b.userId === user.id) - Number(a.userId === user.id)).slice(0, allMembersOpen || members.length <= 5 ? members.length : 4).map((member) => {
              const isMe = member.userId === user.id;
              const role = member.role === "organizer" ? "organisator" : "reiziger";
              const summary = summariseProfile(profileMapByUser.get(member.userId));
              return (
                <button
                  key={member.userId}
                  type="button"
                  disabled={!isMe || readOnly}
                  onClick={() => setProfileSheetOpen(true)}
                  title={summary || undefined}
                  aria-label={`${member.displayName}${isMe ? " (jij)" : ""}, ${role}${isMe ? ". Wensen invullen" : ""}`}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 shadow-soft disabled:cursor-default"
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {member.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-[7rem] truncate text-[13px] font-medium">{isMe ? "Jij" : member.displayName}</span>
                </button>
              );
            })}
            {!allMembersOpen && members.length > 5 && (
              <button type="button" onClick={() => setAllMembersOpen(true)} aria-label={`Toon alle ${members.length} reizigers`} className="flex h-10 shrink-0 items-center rounded-full bg-card px-3 text-[13px] font-semibold shadow-soft">+{members.length - 4}</button>
            )}
            {!readOnly && (
              <button type="button" onClick={() => setInviteOpen((open) => !open)} aria-expanded={inviteOpen} className="flex shrink-0 items-center gap-2 rounded-full border-2 border-dashed border-border py-1 pl-1 pr-3 text-muted-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-full">
                  <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="text-[13px] font-medium">Nodig uit</span>
              </button>
            )}
          </div>

          {!readOnly && inviteOpen && (
            <div className="mt-4">
              {isOrganizer ? (
                <TripInvitesCard tripId={activeTrip.id} />
              ) : (
                <p className="border-t border-rule/20 pt-3 text-sm text-muted-foreground">
                  Alleen de organisator van deze reis kan nieuwe mensen uitnodigen.
                </p>
              )}
            </div>
          )}
        </section>

        <div role="tablist" aria-label="Reis" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-card p-1 shadow-soft">
          {([["planning", "Planning", CalendarDays], ["todo", "Te doen", ListChecks]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`flex h-12 items-center justify-center gap-2 rounded-xl font-brand text-[17px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === id ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground"}`}>
              <Icon className="h-5 w-5" strokeWidth={1.75} />{label}
              {id === "todo" && count > 0 && <span className={`num ${tab === id ? "" : "text-primary"}`}>({count})</span>}
            </button>
          ))}
        </div>

        {tab === "planning" && planning}

        {tab === "todo" && <p className="mt-5 text-[17px] font-semibold">{headline}</p>}


        {actionError && <p className="mt-4 text-sm font-medium text-destructive">{actionError}</p>}

        <section className="mt-4">

          {tab === "todo" && <>
          <div className="mb-1 mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0"><h2 className="font-brand text-xl font-semibold">Taken</h2><p className="truncate text-sm text-muted-foreground">{tasksLine}</p></div>
            {!readOnly && <Button variant="secondary" className="tile-plain h-11 shrink-0 rounded-full px-4" onClick={openNewTask}><Plus />Taak</Button>}
          </div>
          {(
            tasksQuery.isLoading ? (
              <LoadingRows />
            ) : tasks.length === 0 ? (
              <EmptyLine text="Nog geen taken." actionLabel={readOnly ? undefined : "Nieuwe taak"} onClick={readOnly ? undefined : openNewTask} />
            ) : (
              <RowList className="mt-1">
                {tasks.map((task) => {
                  const completed = task.status === "done" || task.progress >= 100;
                  const manager = isOrganizer || task.created_by === user.id;
                  const canComplete = !readOnly && (manager || task.assigned_user_id === user.id || task.backup_user_id === user.id);
                  const assigned = task.assigned_user_id ? memberMap.get(task.assigned_user_id) : null;
                  return (
                    <div key={task.id} className="flex min-h-[52px] items-center gap-3 py-3">
                      <button
                        type="button"
                        disabled={!canComplete}
                        onClick={() => void toggleTask(task)}
                        className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                        aria-label={completed ? "Taak heropenen" : "Taak afronden"}
                      >
                        {completed
                          ? <CheckCircle2 className="h-[20px] w-[20px] text-primary" strokeWidth={1.75} />
                          : <Circle className="h-[20px] w-[20px] text-muted-foreground/50" strokeWidth={1.75} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => (manager && !readOnly ? openTaskEdit(task) : undefined)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className={`block truncate text-[15px] font-medium leading-tight ${completed ? "text-muted-foreground line-through" : ""}`}>
                          {task.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          <UserRound className="mr-1 inline h-3 w-3" />{assigned?.displayName || "Nog niemand"}
                          {task.due_at ? <> · <CalendarClock className="mx-1 inline h-3 w-3" />{formatTripDateTime(task.due_at, timezone)}</> : null}
                        </span>
                      </button>
                      {!completed && task.priority === "high" && <span className="shrink-0 text-[13px] font-semibold text-primary">Eerst doen</span>}
                      {!readOnly && manager && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => void removeTask(task)} aria-label="Taak verwijderen">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </RowList>
            )
          )}

          <div className="mb-3 mt-6 flex items-center justify-between gap-3">
            <div className="min-w-0"><h2 className="font-brand text-xl font-semibold">Keuzes</h2><p className="truncate text-sm text-muted-foreground">{decisionsLine}</p></div>
            {!readOnly && <Button variant="secondary" className="tile-plain h-11 shrink-0 rounded-full px-4" onClick={() => setDecisionSheetOpen(true)}><Plus />Keuze</Button>}
          </div>
          {(
            decisionsQuery.isLoading ? (
              <LoadingRows />
            ) : decisions.length === 0 ? (
              <EmptyLine text="Nog niets te kiezen." actionLabel={readOnly ? undefined : "Nieuwe keuze"} onClick={readOnly ? undefined : () => setDecisionSheetOpen(true)} />
            ) : (
              <div className="mt-1 space-y-5">
                {decisions.map((decision) => {
                  const manager = isOrganizer || isAdmin || decision.created_by === user.id;
                  const stayChoice = decision.title.trim() === ACCOMMODATION_DECISION_TITLE;
                  const finalOption = stayChoice ? selectedStayOption(itemsQuery.data || [], decision.id) : null;
                  const ownVote = decision.options.find((option) => option.votes.some((vote) => vote.user_id === user.id))?.id;
                  const totalVotes = decision.options.reduce((sum, option) => sum + option.votes.length, 0);
                  const topVoteCount = decision.options.length > 0 ? Math.max(...decision.options.map((option) => option.votes.length)) : 0;
                  const expanded = expandedDecision === decision.id;
                  return (
                    <div key={decision.id}>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setExpandedDecision(expanded ? null : decision.id)}
                          aria-expanded={expanded}
                          aria-controls={`decision-options-${decision.id}`}
                          className="tile-plain min-h-24 w-full justify-between gap-3 rounded-2xl px-4 py-4 text-left"
                        >
                          <span className="min-w-0 flex-1">
                          <span className="block break-words font-brand text-xl font-semibold leading-tight">{displayDecisionTitle(decision.title)}</span>
                          <span className="mt-1 block text-sm font-normal text-muted-foreground">
                            {decision.options.length} {decision.options.length === 1 ? "optie" : "opties"} · {totalVotes} {totalVotes === 1 ? "stem" : "stemmen"}
                          </span>
                          </span>
                        <span className="flex shrink-0 flex-col items-end gap-2">
                        <span className={`text-sm font-semibold ${decision.status === "open" && !ownVote ? "text-primary" : "text-muted-foreground"}`}>
                          {decision.status === "closed" && finalOption ? "Gekozen" : decisionStatusLine(decision.status, Boolean(ownVote))}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground ${expanded ? "rotate-180" : ""}`} />
                        </span>
                        </Button>

                      {expanded && (
                        <div id={`decision-options-${decision.id}`} className="mt-5 space-y-3">
                          {decision.description && <p className="text-sm text-muted-foreground">{decision.description}</p>}
                          {decision.options.map((option) => {
                            const chosen = ownVote === option.id;
                            const definitive = decision.status === "closed" && finalOption === option.id;
                            const winner = !finalOption && decision.status === "closed" && totalVotes > 0 && option.votes.length === topVoteCount;
                            return (
                              <div key={option.id} className="space-y-2">
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={readOnly || decision.status !== "open"}
                                onClick={() => void voteFor(decision, option.id)}
                                aria-pressed={chosen}
                                className={`min-h-14 w-full justify-between gap-3 rounded-2xl border px-4 py-3 text-left disabled:opacity-100 ${chosen ? "border-primary bg-primary/10" : "border-border"}`}
                              >
                                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                                  {chosen && <Check className="h-4 w-4 shrink-0 text-primary" />}
                                  <span className="break-words">{option.label}</span>
                                  {definitive && <span className="shrink-0 text-[11px] font-semibold text-primary">Gekozen</span>}
                                  {winner && <span className="shrink-0 text-[11px] font-semibold text-primary">meeste stemmen</span>}
                                </span>
                                <span className="shrink-0 text-xs font-semibold text-muted-foreground num">{option.votes.length}</span>
                              </Button>
                              {stayChoice && !readOnly && (isOrganizer || isAdmin) && (decision.status === "open" || !finalOption) && (
                                <Button variant="secondary" className="h-auto min-h-11 w-full whitespace-normal" disabled={finalizing || itemsQuery.isLoading || itemsQuery.isError} onClick={() => void finalizeStay(decision, option)}>
                                  <Check className="h-4 w-4 shrink-0" />Kies dit verblijf
                                </Button>
                              )}
                              </div>
                            );
                          })}
                          {!readOnly && manager && (
                            <div className="flex flex-wrap gap-3 pt-1">
                              <button type="button" onClick={() => void toggleDecisionClosed(decision)} className="text-[13px] font-semibold text-primary underline-offset-4 hover:underline">
                                {decision.status === "open" ? "Keuze sluiten" : "Keuze heropenen"}
                              </button>
                              <button type="button" onClick={() => void removeDecision(decision)} className="text-[13px] font-medium text-destructive underline-offset-4 hover:underline">
                                Verwijderen
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          </>}
        </section>

      </div>

      <TravelerProfileSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        tripId={activeTrip.id}
        userId={user.id}
        profile={myProfile}
        onSaved={refreshProfiles}
      />
      <TaskSheet
        open={taskSheetOpen}
        onOpenChange={setTaskSheetOpen}
        tripId={activeTrip.id}
        timezone={timezone}
        currentUserId={user.id}
        isOrganizer={isOrganizer}
        members={members}
        task={editingTask}
        onSaved={refreshTasks}
      />
      <TaskWizard
        open={taskWizardOpen}
        onOpenChange={setTaskWizardOpen}
        tripId={activeTrip.id}
        timezone={timezone}
        startDate={activeTrip.start_date}
        currentUserId={user.id}
        isOrganizer={isOrganizer}
        members={members}
        onSaved={refreshTasks}
      />
      <DecisionWizard
        open={decisionSheetOpen}
        onOpenChange={setDecisionSheetOpen}
        tripId={activeTrip.id}
        onSaved={refreshDecisions}
      />
    </>
  );
}

function LoadingRows() {
  return (
    <div className="mt-2 space-y-2">
      {[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-sm bg-secondary" />)}
    </div>
  );
}
