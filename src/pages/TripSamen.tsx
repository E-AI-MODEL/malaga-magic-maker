import { type ReactNode, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  ListChecks,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  UserRound,
  Users,
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
  type TripMemberView,
  updateTask,
} from "@/features/together/data";
import { TaskSheet } from "@/features/together/TaskSheet";
import { DecisionSheet } from "@/features/together/DecisionSheet";
import { ExpenseSheet } from "@/features/together/ExpenseSheet";

type Section = "members" | "tasks" | "decisions" | "expenses";

const sectionLabels: Array<{ id: Section; label: string; icon: typeof Users }> = [
  { id: "members", label: "Medereizigers", icon: Users },
  { id: "tasks", label: "Taken", icon: CheckCircle2 },
  { id: "decisions", label: "Keuzes", icon: ListChecks },
  { id: "expenses", label: "Kosten", icon: Receipt },
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
  const [actionError, setActionError] = useState("");

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

  const members = membersQuery.data || [];
  const memberMap = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const tasks = tasksQuery.data || [];
  const decisions = decisionsQuery.data || [];
  const expenses = expensesQuery.data || [];

  if (!activeTrip || !user) return null;

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

  const openTaskCount = tasks.filter((task) => task.status !== "done" && task.progress < 100).length;
  const openDecisionCount = decisions.filter((decision) => decision.status === "open").length;

  return (
    <AppLayout>
      <div className="px-5 py-7 sm:px-8 sm:py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Samen</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Regel het met elkaar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Mensen, taken, keuzes en gedeelde kosten horen bij dezelfde reis, maar hebben ieder hun eigen duidelijke plek.
          </p>
        </div>

        {readOnly && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
            <Archive className="h-4 w-4" />Deze reis staat in het archief en is alleen-lezen.
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sectionLabels.map((item) => {
            const Icon = item.icon;
            const count = item.id === "members"
              ? members.length
              : item.id === "tasks"
                ? openTaskCount
                : item.id === "decisions"
                  ? openDecisionCount
                  : expenses.length;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSection(item.id);
                  setActionError("");
                }}
                className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                  section === item.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className={`h-4 w-4 ${section === item.id ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-bold text-muted-foreground">{count}</span>
                </div>
                <p className={`mt-2 text-sm font-bold ${section === item.id ? "text-primary" : "text-foreground"}`}>{item.label}</p>
              </button>
            );
          })}
        </div>

        {actionError && (
          <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{actionError}</p>
        )}

        <section className="mt-8">
          {section === "members" && <MembersSection members={members} loading={membersQuery.isLoading} />}

          {section === "tasks" && (
            <div>
              <SectionHeading
                title="Taken"
                description="Wat moet nog gebeuren en wie pakt het op?"
                action={!readOnly ? <Button size="sm" onClick={openNewTask}><Plus className="mr-1 h-4 w-4" />Taak</Button> : null}
              />
              {tasksQuery.isLoading ? (
                <LoadingCards />
              ) : tasks.length === 0 ? (
                <EmptyCard icon={CheckCircle2} title="Nog geen taken" text="Voeg alleen toe wat iemand echt moet regelen." />
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const completed = task.status === "done" || task.progress >= 100;
                    const manager = isOrganizer || task.created_by === user.id;
                    const canComplete = !readOnly && (manager || task.assigned_user_id === user.id || task.backup_user_id === user.id);
                    const assigned = task.assigned_user_id ? memberMap.get(task.assigned_user_id) : null;
                    return (
                      <article key={task.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <button
                            disabled={!canComplete}
                            onClick={() => void toggleTask(task)}
                            className={`mt-0.5 shrink-0 ${canComplete ? "cursor-pointer" : "cursor-default"}`}
                            aria-label={completed ? "Taak heropenen" : "Taak afronden"}
                          >
                            {completed ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <Circle className="h-6 w-6 text-muted-foreground/50" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className={`font-display text-base font-extrabold ${completed ? "text-muted-foreground line-through" : ""}`}>{task.title}</h3>
                                {task.description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{task.description}</p>}
                              </div>
                              {!readOnly && manager && (
                                <div className="flex shrink-0 gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTaskEdit(task)} aria-label="Taak wijzigen"><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void removeTask(task)} aria-label="Taak verwijderen"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span><UserRound className="mr-1 inline h-3.5 w-3.5" />{assigned?.displayName || "Nog niemand"}</span>
                              {task.due_at && <span><CalendarClock className="mr-1 inline h-3.5 w-3.5" />{formatTripDateTime(task.due_at, timezone)}</span>}
                              {task.priority === "high" && <span className="font-semibold text-amber-600">Belangrijk</span>}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {section === "decisions" && (
            <div>
              <SectionHeading
                title="Keuzes"
                description="Leg een duidelijke vraag voor en kies samen."
                action={!readOnly ? <Button size="sm" onClick={() => setDecisionSheetOpen(true)}><Plus className="mr-1 h-4 w-4" />Keuze</Button> : null}
              />
              {decisionsQuery.isLoading ? (
                <LoadingCards />
              ) : decisions.length === 0 ? (
                <EmptyCard icon={ListChecks} title="Nog niets te kiezen" text="Start een keuze wanneer er echt meerdere opties op tafel liggen." />
              ) : (
                <div className="space-y-4">
                  {decisions.map((decision) => {
                    const manager = isOrganizer || decision.created_by === user.id;
                    const ownVote = decision.options.find((option) => option.votes.some((vote) => vote.user_id === user.id))?.id;
                    const totalVotes = decision.options.reduce((sum, option) => sum + option.votes.length, 0);
                    const topVoteCount = decision.options.length > 0 ? Math.max(...decision.options.map((option) => option.votes.length)) : 0;
                    return (
                      <article key={decision.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{decision.status === "open" ? "Stemmen open" : "Keuze gesloten"}</p>
                            <h3 className="mt-1 font-display text-lg font-extrabold">{decision.title}</h3>
                            {decision.description && <p className="mt-1 text-sm text-muted-foreground">{decision.description}</p>}
                          </div>
                          {!readOnly && manager && (
                            <div className="flex shrink-0 gap-1">
                              <Button variant="outline" size="sm" onClick={() => void toggleDecisionClosed(decision)}>{decision.status === "open" ? "Sluiten" : "Heropenen"}</Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void removeDecision(decision)} aria-label="Keuze verwijderen"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 space-y-2">
                          {decision.options.map((option) => {
                            const chosen = ownVote === option.id;
                            const winner = decision.status === "closed" && totalVotes > 0 && option.votes.length === topVoteCount;
                            return (
                              <button
                                key={option.id}
                                disabled={readOnly || decision.status !== "open"}
                                onClick={() => void voteFor(decision, option.id)}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${chosen ? "border-primary bg-primary/10" : "border-border"} ${!readOnly && decision.status === "open" ? "hover:border-primary/40" : "cursor-default"}`}
                              >
                                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                                  {chosen && <Check className="h-4 w-4 shrink-0 text-primary" />}
                                  <span className="truncate">{option.label}</span>
                                  {winner && <span className="text-xs text-primary">meeste stemmen</span>}
                                </span>
                                <span className="shrink-0 text-xs font-bold text-muted-foreground">{option.votes.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {section === "expenses" && (
            <div>
              <SectionHeading
                title="Kosten"
                description="Wie betaalde wat, en hoe verdelen jullie het?"
                action={!readOnly ? <Button size="sm" onClick={openNewExpense}><Plus className="mr-1 h-4 w-4" />Kosten</Button> : null}
              />
              {expensesQuery.isLoading ? (
                <LoadingCards />
              ) : expenses.length === 0 ? (
                <EmptyCard icon={Receipt} title="Nog geen gedeelde kosten" text="Voeg een bedrag toe zodra iemand iets voor de reis heeft betaald." />
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => {
                    const manager = isOrganizer || expense.created_by === user.id;
                    const payer = expense.paid_by_user_id ? memberMap.get(expense.paid_by_user_id) : null;
                    return (
                      <article key={expense.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-display text-base font-extrabold">{expense.description}</h3>
                            <p className="mt-1 text-2xl font-extrabold text-primary">{formatMoney(expense.amount, expense.currency)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Betaald door {payer?.displayName || "nog te koppelen"}</p>
                          </div>
                          {!readOnly && manager && (
                            <div className="flex shrink-0 gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openExpenseEdit(expense)} aria-label="Kosten wijzigen"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void removeExpense(expense)} aria-label="Kosten verwijderen"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </div>
                        {expense.splits.length > 0 ? (
                          <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                            {expense.splits.map((split) => (
                              <div key={split.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate text-muted-foreground">{memberMap.get(split.user_id)?.displayName || "Medereiziger"}</span>
                                <span className="font-mono font-semibold">{formatMoney(split.amount, expense.currency)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                            Deze oude kostenregel heeft nog geen UUID-verdeling. Open wijzigen om hem bewust te koppelen.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

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

function MembersSection({ members, loading }: { members: TripMemberView[]; loading: boolean }) {
  if (loading) return <LoadingCards />;
  return (
    <div>
      <SectionHeading title="Medereizigers" description="Wie hoort bij deze reis en wie organiseert hem?" />
      {members.length === 0 ? (
        <EmptyCard icon={Users} title="Nog geen medereizigers" text="Deze reis heeft nog geen zichtbare memberships." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                {member.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{member.displayName}</p>
                <p className="text-xs text-muted-foreground">{member.role === "organizer" ? "Organisator" : "Medereiziger"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-extrabold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyCard({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
      <h3 className="font-display text-lg font-extrabold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function LoadingCards() {
  return <div className="space-y-3">{[0, 1].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />)}</div>;
}
