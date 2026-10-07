import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  ListChecks,
  Plus,
  Receipt,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { formatTripDateTime } from "@/features/travel/presentation";
import type { TaskRow } from "@/integrations/supabase/database";
import {
  deleteDecision,
  deleteExpense,
  deleteTask,
  type DecisionBundle,
  type ExpenseBundle,
  listDecisions,
  listExpenses,
  listTasks,
  listTripMembers,
  setDecisionStatus,
  setDecisionVote,
  updateTask,
} from "@/features/together/data";
import { TaskSheet } from "@/features/together/TaskSheet";
import { DecisionSheet } from "@/features/together/DecisionSheet";
import { ExpenseSheet } from "@/features/together/ExpenseSheet";
import { computeBalances, settleBalances } from "@/features/together/settle";
import { TripInvitesCard } from "@/features/invites/TripInvitesCard";
import { listTravelerProfiles, summariseProfile } from "@/features/travelers/data";
import { TravelerProfileSheet } from "@/features/travelers/TravelerProfileSheet";
import { RecentActivity } from "@/features/notifications/RecentActivity";
import { CountBar, EmptyLine, RowItem, RowList, SectionLabel, Segmented, StatusWord, StickyBar } from "@/components/primitives";

/** The primary switcher holds only the three kinds of shared work. */
type Section = "tasks" | "decisions" | "expenses";

const sectionOptions: Array<{ id: Section; label: string }> = [
  { id: "tasks", label: "Taken" },
  { id: "decisions", label: "Keuzes" },
  { id: "expenses", label: "Kosten" },
];

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);
}

export default function TripSamen() {
  const { user } = useAuth();
  const { activeTrip, isOrganizer } = useTrip();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("tasks");
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [decisionSheetOpen, setDecisionSheetOpen] = useState(false);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseBundle | null>(null);
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const tripId = activeTrip?.id || "";
  const timezone = activeTrip?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam";
  const currency = activeTrip?.currency || "EUR";
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
  const expenses = useMemo(() => expensesQuery.data || [], [expensesQuery.data]);


  const balances = useMemo(
    () =>
      computeBalances(
        expenses.map((expense) => ({
          paidByUserId: expense.paid_by_user_id,
          amount: Number(expense.amount) || 0,
          splits: expense.splits.map((split) => ({ user_id: split.user_id, amount: Number(split.amount) || 0 })),
        }))
      ),
    [expenses]
  );
  const transfers = useMemo(() => settleBalances(balances), [balances]);

  if (!activeTrip || !user) return null;

  const copySettlement = async () => {
    const lines = transfers.map((transfer) => {
      const from = memberMap.get(transfer.fromUserId)?.displayName || "Medereiziger";
      const to = memberMap.get(transfer.toUserId)?.displayName || "Medereiziger";
      return `${from} betaalt ${to} ${formatMoney(transfer.cents / 100, currency)}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("Kopiëren lukte niet op dit apparaat.");
    }
  };

  const refreshTasks = () => queryClient.invalidateQueries({ queryKey: ["together-tasks", activeTrip.id] });
  const refreshDecisions = () => queryClient.invalidateQueries({ queryKey: ["together-decisions", activeTrip.id] });
  const refreshExpenses = () => queryClient.invalidateQueries({ queryKey: ["together-expenses", activeTrip.id] });

  const openNewTask = () => {
    setEditingTask(null);
    setTaskSheetOpen(true);
  };
  const openTaskEdit = (task: TaskRow) => {
    setEditingTask(task);
    setTaskSheetOpen(true);
  };
  const openNewExpense = () => {
    setEditingExpense(null);
    setExpenseSheetOpen(true);
  };
  const openExpenseEdit = (expense: ExpenseBundle) => {
    setEditingExpense(expense);
    setExpenseSheetOpen(true);
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

  const removeExpense = async (expense: ExpenseBundle) => {
    if (!window.confirm(`Kosten '${expense.description}' verwijderen?`)) return;
    try {
      await deleteExpense(activeTrip.id, expense.id);
      await refreshExpenses();
    } catch (error) {
      console.error("expense delete failed", error);
      setActionError("De kosten konden niet worden verwijderd.");
    }
  };

  const openTasks = tasks.filter((task) => task.status !== "done" && task.progress < 100);
  const openDecisions = decisions.filter((decision) => decision.status === "open");
  const myTasks = openTasks.filter((task) => task.assigned_user_id === user.id || task.backup_user_id === user.id);
  const myPendingDecisions = openDecisions.filter(
    (decision) => !decision.options.some((option) => option.votes.some((vote) => vote.user_id === user.id)),
  );
  const personalAttentionCount = myTasks.length + myPendingDecisions.length;

  const groupLine = `${members.length} ${members.length === 1 ? "reiziger" : "reizigers"} · ${openTasks.length} open ${
    openTasks.length === 1 ? "taak" : "taken"
  } · ${openDecisions.length} open ${openDecisions.length === 1 ? "keuze" : "keuzes"}`;

  const addAction = !readOnly
    ? section === "tasks"
      ? { label: "Nieuwe taak", run: openNewTask }
      : section === "decisions"
        ? { label: "Nieuwe keuze", run: () => setDecisionSheetOpen(true) }
        : { label: "Kosten toevoegen", run: openNewExpense }
    : null;

  return (
    <AppLayout>
      <div className="px-5 pb-12 pt-5 sm:px-8">
        <h1 className="font-display uppercase tracking-tight text-[24px] font-extrabold leading-tight">Samen</h1>
        <div className="mt-3 border-y border-rule py-3">
          <CountBar
            items={[
              { label: "Reizigers", value: members.length },
              { label: "Open taken", value: openTasks.length, onClick: () => setSection("tasks") },
              { label: "Open keuzes", value: openDecisions.length, onClick: () => setSection("decisions") },
              { label: "Kostenregels", value: expenses.length, onClick: () => setSection("expenses") },
            ]}
          />
        </div>

        {readOnly && (
          <div className="mt-4 flex items-center gap-2 border-t border-rule/10 pt-3 text-sm text-muted-foreground">
            <Archive className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            Deze reis staat in het archief en is alleen-lezen.
          </div>
        )}

        <section className="mt-7">
          <SectionLabel
            action={
              !readOnly ? (
                <button
                  type="button"
                  onClick={() => setInviteOpen((open) => !open)}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary underline-offset-4 hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                  {inviteOpen ? "Sluiten" : "Uitnodigen"}
                </button>
              ) : null
            }
          >
            Reizigers
          </SectionLabel>

          {membersQuery.isLoading ? (
            <LoadingRows />
          ) : (
            <RowList className="mt-1">
              {members.map((member) => {
                const summary = summariseProfile(profileMapByUser.get(member.userId));
                const isMe = member.userId === user.id;
                return (
                  <div key={member.userId} className="flex min-h-[48px] items-start gap-3 py-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                      {member.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">
                        {member.displayName}{isMe ? " (jij)" : ""}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                        {summary || (isMe ? "Nog geen wensen ingevuld" : "Wensen nog niet ingevuld")}
                      </p>
                    </div>
                    {isMe && !readOnly ? (
                      <button
                        type="button"
                        onClick={() => setProfileSheetOpen(true)}
                        className="shrink-0 text-[13px] font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {myProfile ? "Aanpassen" : "Invullen"}
                      </button>
                    ) : (
                      <StatusWord tone="muted">{member.role === "organizer" ? "Organisator" : "Reiziger"}</StatusWord>
                    )}
                  </div>
                );
              })}
            </RowList>
          )}

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

        {personalAttentionCount > 0 && (

          <section className="mt-7">
            <SectionLabel>Voor jou</SectionLabel>
            <RowList className="mt-1">
              {myTasks.slice(0, 3).map((task) => (
                <RowItem
                  key={`task-${task.id}`}
                  icon={Circle}
                  emphasis
                  title={task.title}
                  meta="Jouw taak"
                  onClick={() => setSection("tasks")}
                />
              ))}
              {myPendingDecisions.slice(0, Math.max(0, 3 - myTasks.length)).map((decision) => (
                <RowItem
                  key={`decision-${decision.id}`}
                  icon={ListChecks}
                  emphasis
                  title={decision.title}
                  meta="Jij hebt nog niet gestemd"
                  onClick={() => setSection("decisions")}
                />
              ))}
            </RowList>
          </section>
        )}

        <StickyBar className="mt-5">
          <Segmented
            value={section}
            onChange={(next) => {
              setSection(next);
              setActionError("");
            }}
            options={sectionOptions.map((option) => ({
              ...option,
              label: `${option.label} ${
                option.id === "tasks" ? openTasks.length : option.id === "decisions" ? openDecisions.length : expenses.length
              }`,
            }))}
          />
        </StickyBar>

        {actionError && <p className="mt-4 text-sm font-medium text-destructive">{actionError}</p>}

        <section className="mt-5">
          <SectionLabel
            action={
              addAction ? (
                <button
                  type="button"
                  onClick={addAction.run}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary underline-offset-4 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />{addAction.label}
                </button>
              ) : null
            }
          >
            {section === "tasks" ? "Taken" : section === "decisions" ? "Keuzes" : "Kosten"}
          </SectionLabel>

          {section === "tasks" && (
            tasksQuery.isLoading ? (
              <LoadingRows />
            ) : tasks.length === 0 ? (
              <EmptyLine text="Nog geen taken. Voeg alleen toe wat iemand echt moet regelen." actionLabel={readOnly ? undefined : "Nieuwe taak"} onClick={readOnly ? undefined : openNewTask} />
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
                      <StatusWord tone={completed ? "done" : task.priority === "high" ? "attention" : "neutral"}>
                        {completed ? "Afgerond" : task.priority === "high" ? "Belangrijk" : "Open"}
                      </StatusWord>
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

          {section === "decisions" && (
            decisionsQuery.isLoading ? (
              <LoadingRows />
            ) : decisions.length === 0 ? (
              <EmptyLine text="Nog niets te kiezen. Start een keuze wanneer er echt meerdere opties op tafel liggen." actionLabel={readOnly ? undefined : "Nieuwe keuze"} onClick={readOnly ? undefined : () => setDecisionSheetOpen(true)} />
            ) : (
              <RowList className="mt-1">
                {decisions.map((decision) => {
                  const manager = isOrganizer || decision.created_by === user.id;
                  const ownVote = decision.options.find((option) => option.votes.some((vote) => vote.user_id === user.id))?.id;
                  const totalVotes = decision.options.reduce((sum, option) => sum + option.votes.length, 0);
                  const topVoteCount = decision.options.length > 0 ? Math.max(...decision.options.map((option) => option.votes.length)) : 0;
                  const expanded = expandedDecision === decision.id;
                  return (
                    <div key={decision.id} className="py-3">
                      <div className="flex min-h-[46px] items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedDecision(expanded ? null : decision.id)}
                          aria-expanded={expanded}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-[15px] font-medium leading-tight">{decision.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {decision.options.length} {decision.options.length === 1 ? "optie" : "opties"} · {totalVotes} {totalVotes === 1 ? "stem" : "stemmen"}
                          </span>
                        </button>
                        <StatusWord tone={decision.status === "open" ? "attention" : "muted"}>
                          {decision.status === "open" ? "Stemmen open" : "Gesloten"}
                        </StatusWord>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>

                      {expanded && (
                        <div className="mt-2 space-y-1.5 pl-1">
                          {decision.description && <p className="text-sm text-muted-foreground">{decision.description}</p>}
                          {decision.options.map((option) => {
                            const chosen = ownVote === option.id;
                            const winner = decision.status === "closed" && totalVotes > 0 && option.votes.length === topVoteCount;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                disabled={readOnly || decision.status !== "open"}
                                onClick={() => void voteFor(decision, option.id)}
                                className={`flex w-full items-center justify-between gap-3 rounded-[14px] border px-3.5 py-2.5 text-left transition-colors ${chosen ? "border-primary bg-primary/5" : "border-border"} ${!readOnly && decision.status === "open" ? "hover:border-primary/40" : "cursor-default"}`}
                              >
                                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                                  {chosen && <Check className="h-4 w-4 shrink-0 text-primary" />}
                                  <span className="truncate">{option.label}</span>
                                  {winner && <span className="shrink-0 text-[11px] font-semibold text-primary">meeste stemmen</span>}
                                </span>
                                <span className="shrink-0 text-xs font-semibold text-muted-foreground num">{option.votes.length}</span>
                              </button>
                            );
                          })}
                          {!readOnly && manager && (
                            <div className="flex gap-3 pt-1">
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
              </RowList>
            )
          )}

          {section === "expenses" && (
            expensesQuery.isLoading ? (
              <LoadingRows />
            ) : expenses.length === 0 ? (
              <EmptyLine text="Nog geen gedeelde kosten. Voeg een bedrag toe zodra iemand iets voor de reis heeft betaald." actionLabel={readOnly ? undefined : "Kosten toevoegen"} onClick={readOnly ? undefined : openNewExpense} />
            ) : (
              <RowList className="mt-1">
                {expenses.map((expense) => {
                  const manager = isOrganizer || expense.created_by === user.id;
                  const payer = expense.paid_by_user_id ? memberMap.get(expense.paid_by_user_id) : null;
                  const expanded = expandedExpense === expense.id;
                  return (
                    <div key={expense.id} className="py-3">
                      <div className="flex min-h-[46px] items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedExpense(expanded ? null : expense.id)}
                          aria-expanded={expanded}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-[15px] font-medium leading-tight">{expense.description}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            Betaald door {payer?.displayName || "nog te koppelen"} ·{" "}
                            {expense.splits.length > 0 ? `verdeeld over ${expense.splits.length}` : "verdeling nog niet ingevuld"}
                          </span>
                        </button>
                        <span className="shrink-0 text-[15px] font-semibold num">{formatMoney(expense.amount, expense.currency)}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>

                      {expanded && (
                        <div className="mt-2 space-y-1 pl-1">
                          {expense.splits.map((split) => (
                            <div key={split.id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate text-muted-foreground">{memberMap.get(split.user_id)?.displayName || "Medereiziger"}</span>
                              <span className="num font-medium">{formatMoney(split.amount, expense.currency)}</span>
                            </div>
                          ))}
                          {!readOnly && manager && (
                            <div className="flex gap-3 pt-1.5">
                              <button type="button" onClick={() => openExpenseEdit(expense)} className="text-[13px] font-semibold text-primary underline-offset-4 hover:underline">
                                Wijzigen
                              </button>
                              <button type="button" onClick={() => void removeExpense(expense)} className="text-[13px] font-medium text-destructive underline-offset-4 hover:underline">
                                Verwijderen
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </RowList>
            )
          )}

          {section === "expenses" && expenses.length > 0 && (
            <div className="mt-7">
              <SectionLabel>Verrekenen</SectionLabel>
              {balances.length === 0 ? (
                <EmptyLine text="Koppel een betaler en verdeling aan de kostenregels om te kunnen verrekenen." />
              ) : (
                <>
                  <RowList className="mt-1">
                    {balances.map((balance) => {
                      const settled = balance.cents === 0;
                      return (
                        <div key={balance.userId} className="flex min-h-[44px] items-center gap-3 py-2.5">
                          <span className="min-w-0 flex-1 truncate text-[15px]">
                            {memberMap.get(balance.userId)?.displayName || "Medereiziger"}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {settled ? "staat gelijk" : balance.cents > 0 ? "krijgt terug" : "moet betalen"}
                          </span>
                          <span
                            className={`num shrink-0 text-[15px] font-semibold ${settled ? "text-muted-foreground" : balance.cents > 0 ? "text-primary" : "text-foreground"}`}
                          >
                            {formatMoney(Math.abs(balance.cents) / 100, currency)}
                          </span>
                        </div>
                      );
                    })}
                  </RowList>

                  <div className="mt-4">
                    <SectionLabel>Wie betaalt wie</SectionLabel>
                    {transfers.length === 0 ? (
                      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                        Alles is al verrekend.
                      </p>
                    ) : (
                      <RowList className="mt-1">
                        {transfers.map((transfer, index) => (
                          <div key={`${transfer.fromUserId}-${transfer.toUserId}-${index}`} className="flex min-h-[44px] items-center gap-2 py-2.5">
                            <span className="min-w-0 flex-1 truncate text-[15px]">
                              {memberMap.get(transfer.fromUserId)?.displayName || "Medereiziger"}
                            </span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/70" strokeWidth={1.75} />
                            <span className="min-w-0 flex-1 truncate text-[15px]">
                              {memberMap.get(transfer.toUserId)?.displayName || "Medereiziger"}
                            </span>
                            <span className="num shrink-0 text-[15px] font-semibold">{formatMoney(transfer.cents / 100, currency)}</span>
                          </div>
                        ))}
                      </RowList>
                    )}
                    {transfers.length > 0 && (
                      <button
                        type="button"
                        onClick={copySettlement}
                        className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {copied ? "Gekopieerd" : "Overzicht kopiëren"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>




        {expenses.length > 0 && (
          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Receipt className="h-4 w-4" strokeWidth={1.75} />
            {expenses.length} {expenses.length === 1 ? "kostenregel" : "kostenregels"} in deze reis
          </p>
        )}
        <div className="px-5 pb-6 sm:px-8"><RecentActivity tripId={activeTrip.id} /></div>
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
      <DecisionSheet
        open={decisionSheetOpen}
        onOpenChange={setDecisionSheetOpen}
        tripId={activeTrip.id}
        onSaved={refreshDecisions}
      />
      <ExpenseSheet
        open={expenseSheetOpen}
        onOpenChange={setExpenseSheetOpen}
        tripId={activeTrip.id}
        tripCurrency={currency}
        currentUserId={user.id}
        members={members}
        expense={editingExpense}
        onSaved={refreshExpenses}
      />
    </AppLayout>
  );
}

function LoadingRows() {
  return (
    <div className="mt-2 space-y-2">
      {[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-sm bg-secondary" />)}
    </div>
  );
}
