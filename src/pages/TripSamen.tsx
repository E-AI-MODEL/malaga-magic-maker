import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Circle, ListChecks, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { SectionLabel, Segmented } from "@/components/primitives";
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

  const openTasks = tasks.filter((task) => task.status !== "done" && task.progress < 100);
  const openTaskCount = openTasks.length;
  const openDecisions = decisions.filter((decision) => decision.status === "open");
  const openDecisionCount = openDecisions.length;
  const myTasks = openTasks.filter((task) => task.assigned_user_id === user.id || task.backup_user_id === user.id);
  const myPendingDecisions = openDecisions.filter(
    (decision) => !decision.options.some((option) => option.votes.some((vote) => vote.user_id === user.id)),
  );
  const personalAttentionCount = myTasks.length + myPendingDecisions.length;

  return (
    <AppLayout>
      <div className="px-5 py-6 sm:px-8 sm:py-9">
        <header className="border-b border-rule/10 pb-5">
          <h1 className="font-brand text-2xl font-semibold tracking-tight">Samen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} reizigers · {openTaskCount} open taken · {openDecisionCount} open keuzes
          </p>
        </header>

        {readOnly && (
          <p className="mt-4 border-l-2 border-rule/20 py-2 pl-3 text-sm text-muted-foreground">
            Deze reis staat in het archief en is alleen-lezen.
          </p>
        )}

        <section className="mt-6">
          <SectionLabel>Voor jou</SectionLabel>
          {tasksQuery.isLoading || decisionsQuery.isLoading ? (
            <div className="mt-3 h-12 animate-pulse rounded-md bg-secondary/70" />
          ) : personalAttentionCount === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Je hebt geen open taak en geen keuze waarop je nog moet stemmen.
            </p>
          ) : (
            <div className="mt-1 rule-divide">
              {myTasks.slice(0, 3).map((task) => (
                <button key={task.id} type="button" onClick={() => setSection("tasks")} className="flex w-full items-center gap-3 py-3 text-left">
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{task.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">Taak</span>
                </button>
              ))}
              {myPendingDecisions.slice(0, Math.max(0, 3 - myTasks.length)).map((decision) => (
                <button key={decision.id} type="button" onClick={() => setSection("decisions")} className="flex w-full items-center gap-3 py-3 text-left">
                  <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{decision.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">Keuze</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6">
          <Segmented
            value={section}
            onChange={(next) => {
              setSection(next);
              setActionError("");
            }}
            options={sectionOptions}
          />
        </div>

        {actionError && <p className="mt-4 text-sm font-medium text-destructive">{actionError}</p>}

        <section className="mt-5">
          {section === "tasks" && (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-rule/10 pb-2">
                <p className="text-[13px] font-semibold text-foreground/70">Taken</p>
                {!readOnly && (
                  <Button variant="ghost" size="sm" onClick={openNewTask} className="text-primary">
                    <Plus className="mr-1 h-4 w-4" />Nieuwe taak
                  </Button>
                )}
              </div>
              {tasksQuery.isLoading ? (
                <LoadingRows />
              ) : tasks.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Nog geen taken. Voeg alleen toe wat iemand echt moet regelen.</p>
              ) : (
                <div className="rule-divide">
                  {tasks.map((task) => {
                    const completed = task.status === "done" || task.progress >= 100;
                    const manager = isOrganizer || task.created_by === user.id;
                    const canComplete = !readOnly && (manager || task.assigned_user_id === user.id || task.backup_user_id === user.id);
                    const assigned = task.assigned_user_id ? memberMap.get(task.assigned_user_id) : null;
                    return (
                      <div key={task.id} className="flex items-center gap-3 py-3.5">
                        <button
                          disabled={!canComplete}
                          onClick={() => void toggleTask(task)}
                          className="shrink-0"
                          aria-label={completed ? "Taak heropenen" : "Taak afronden"}
                        >
                          {completed ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground/50" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-[15px] font-medium leading-tight ${completed ? "text-muted-foreground line-through" : ""}`}>{task.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {assigned?.displayName || "Nog niemand"}
                            {task.due_at ? ` · ${formatTripDateTime(task.due_at, timezone)}` : ""}
                            {task.priority === "high" ? " · Belangrijk" : ""}
                          </p>
                        </div>
                        {!readOnly && manager && (
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTaskEdit(task)} aria-label="Taak wijzigen"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void removeTask(task)} aria-label="Taak verwijderen"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {section === "decisions" && (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-rule/10 pb-2">
                <p className="text-[13px] font-semibold text-foreground/70">Keuzes</p>
                {!readOnly && (
                  <Button variant="ghost" size="sm" onClick={() => setDecisionSheetOpen(true)} className="text-primary">
                    <Plus className="mr-1 h-4 w-4" />Nieuwe keuze
                  </Button>
                )}
              </div>
              {decisionsQuery.isLoading ? (
                <LoadingRows />
              ) : decisions.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Nog niets te kiezen. Start een keuze wanneer er meerdere opties op tafel liggen.</p>
              ) : (
                <div className="rule-divide">
                  {decisions.map((decision) => {
                    const manager = isOrganizer || decision.created_by === user.id;
                    const ownVote = decision.options.find((option) => option.votes.some((vote) => vote.user_id === user.id))?.id;
                    const totalVotes = decision.options.reduce((sum, option) => sum + option.votes.length, 0);
                    const topVoteCount = decision.options.length > 0 ? Math.max(...decision.options.map((option) => option.votes.length)) : 0;
                    return (
                      <div key={decision.id} className="py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium leading-tight">{decision.title}</p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {decision.status === "open" ? "Stemmen open" : "Keuze gesloten"}
                              {decision.description ? ` · ${decision.description}` : ""}
                            </p>
                          </div>
                          {!readOnly && manager && (
                            <div className="flex shrink-0 items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => void toggleDecisionClosed(decision)}>{decision.status === "open" ? "Sluiten" : "Heropenen"}</Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void removeDecision(decision)} aria-label="Keuze verwijderen"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          {decision.options.map((option) => {
                            const chosen = ownVote === option.id;
                            const winner = decision.status === "closed" && totalVotes > 0 && option.votes.length === topVoteCount;
                            return (
                              <button
                                key={option.id}
                                disabled={readOnly || decision.status !== "open"}
                                onClick={() => void voteFor(decision, option.id)}
                                className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${chosen ? "bg-primary/10 text-foreground" : "hover:bg-secondary/60"}`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  {chosen && <Check className="h-4 w-4 shrink-0 text-primary" />}
                                  <span className="truncate">{option.label}</span>
                                  {winner && <span className="shrink-0 text-xs text-primary">meeste stemmen</span>}
                                </span>
                                <span className="shrink-0 text-xs tabular text-muted-foreground">{option.votes.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {section === "expenses" && (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-rule/10 pb-2">
                <p className="text-[13px] font-semibold text-foreground/70">Kosten</p>
                {!readOnly && (
                  <Button variant="ghost" size="sm" onClick={openNewExpense} className="text-primary">
                    <Plus className="mr-1 h-4 w-4" />Kosten toevoegen
                  </Button>
                )}
              </div>
              {expensesQuery.isLoading ? (
                <LoadingRows />
              ) : expenses.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Nog geen gedeelde kosten. Voeg een bedrag toe zodra iemand iets voor de reis betaalde.</p>
              ) : (
                <div className="rule-divide">
                  {expenses.map((expense) => {
                    const manager = isOrganizer || expense.created_by === user.id;
                    const payer = expense.paid_by_user_id ? memberMap.get(expense.paid_by_user_id) : null;
                    return (
                      <div key={expense.id} className="flex items-center gap-3 py-3.5">
                        <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium leading-tight">{expense.description}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            Betaald door {payer?.displayName || "nog te koppelen"}
                            {expense.splits.length > 0 ? ` · verdeeld over ${expense.splits.length}` : " · verdeling nog niet ingevuld"}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular">{formatMoney(expense.amount, expense.currency)}</span>
                        {!readOnly && manager && (
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openExpenseEdit(expense)} aria-label="Kosten wijzigen"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void removeExpense(expense)} aria-label="Kosten verwijderen"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <MembersSection members={members} loading={membersQuery.isLoading} />
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
  return (
    <section className="mt-10">
      <SectionLabel>Reizigers</SectionLabel>
      {loading ? (
        <LoadingRows />
      ) : members.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Er zijn nog geen andere mensen aan deze reis gekoppeld.</p>
      ) : (
        <div className="mt-1 rule-divide">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {member.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{member.displayName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{member.role === "organizer" ? "Organisator" : "Medereiziger"}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LoadingRows() {
  return <div className="space-y-2 py-3">{[0, 1].map((item) => <div key={item} className="h-10 animate-pulse rounded-md bg-secondary/70" />)}</div>;
}