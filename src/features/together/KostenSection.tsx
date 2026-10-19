import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Archive, Check, ChevronDown, Copy, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RowList, SectionLabel } from "@/components/primitives";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { deleteExpense, listExpenses, listTripMembers, type ExpenseBundle } from "@/features/together/data";
import { ExpenseSheet } from "@/features/together/ExpenseSheet";
import { PaymentRequestSheet } from "@/features/together/PaymentRequestSheet";
import { formatExpenseMoney as money, settlementByCurrency } from "@/features/together/settlement";

export function KostenSection() {
  const { activeTrip, isOrganizer } = useTrip();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tripId = activeTrip?.id || "";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseBundle | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ recipientName: string; amount: number; currency: string } | null>(null);
  const membersQuery = useQuery({ queryKey: ["trip-members-view", tripId], queryFn: () => listTripMembers(tripId), enabled: Boolean(tripId) });
  const expensesQuery = useQuery({ queryKey: ["together-expenses", tripId], queryFn: () => listExpenses(tripId), enabled: Boolean(tripId) });
  const detailsQuery = useQuery({
    queryKey: ["payment-details-me", user?.id], enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return null;
      const result = await supabase.from("payment_details").select("iban, account_name").eq("user_id", user.id).maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const expenses = useMemo(() => expensesQuery.data || [], [expensesQuery.data]);
  const groups = useMemo(() => settlementByCurrency(expenses), [expenses]);
  const members = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const names = new Map(members.map((member) => [member.userId, member.displayName]));
  if (!activeTrip || !user) return null;
  const readOnly = activeTrip.status === "archived";
  const openNew = () => { setEditing(null); setSheetOpen(true); };
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["together-expenses", tripId] }),
      queryClient.invalidateQueries({ queryKey: ["home-facts"] }),
    ]);
  };
  const remove = async (expense: ExpenseBundle) => {
    if (!window.confirm(`Bonnetje '${expense.description}' verwijderen?`)) return;
    try { await deleteExpense(tripId, expense.id); await refresh(); }
    catch { toast.error("Het bonnetje kon niet worden verwijderd."); }
  };
  const copy = async () => {
    const lines = groups.flatMap((group) => group.transfers.map((transfer) => `${names.get(transfer.fromUserId) || "Medereiziger"} betaalt ${names.get(transfer.toUserId) || "Medereiziger"} ${money(transfer.cents / 100, group.currency)}`));
    try { await navigator.clipboard.writeText(lines.join("\n")); toast.success("Gekopieerd"); }
    catch { toast.error("Kopiëren lukte niet op dit apparaat."); }
  };
  const personal = groups.flatMap((group) => group.transfers.filter((transfer) => transfer.fromUserId === user.id || transfer.toUserId === user.id).map((transfer) => ({ ...transfer, currency: group.currency })));
  const transfers = groups.flatMap((group) => group.transfers.map((transfer) => ({ ...transfer, currency: group.currency })));

  return <>
    <div>
      <header className="mt-6 flex items-center gap-3 border-b border-dashed border-border pb-5">
        <Receipt className="h-9 w-9 shrink-0 text-foreground" strokeWidth={1.5} aria-hidden />
        <h2 className="font-display text-2xl font-bold">Knaakie</h2>
        <span className="ml-auto text-sm text-muted-foreground num">{expenses.length} {expenses.length === 1 ? "bonnetje" : "bonnetjes"}</span>
      </header>
      {readOnly && <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground"><Archive className="h-4 w-4 shrink-0" />Deze reis is gearchiveerd. Je kunt de kosten nog bekijken.</p>}
      <section className="py-5">
        <SectionLabel>Voor jou</SectionLabel>
        {expensesQuery.isPending ? <p className="py-3 text-sm text-muted-foreground">Kosten laden…</p> : expensesQuery.isError ? <p className="py-3 text-sm text-muted-foreground">De kosten zijn nu niet beschikbaar. <Button variant="link" onClick={() => void expensesQuery.refetch()}>Opnieuw proberen</Button></p> : personal.length ? <RowList>
          {personal.map((transfer) => {
            const pay = transfer.fromUserId === user.id;
            const name = names.get(pay ? transfer.toUserId : transfer.fromUserId) || "Medereiziger";
            const Icon = pay ? ArrowUpRight : ArrowDownLeft;
            return <div key={`${transfer.currency}-${transfer.fromUserId}-${transfer.toUserId}`} className="flex items-start gap-3 py-3">
              <Icon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1"><p className="break-words text-[15px]">{pay ? `Jij betaalt ${name}` : `Je krijgt terug van ${name}`}</p><p className="num mt-1 font-display text-2xl font-semibold">{money(transfer.cents / 100, transfer.currency)}</p>
                {!pay && !readOnly && <Button variant="outline" size="sm" className="mt-2" onClick={() => setPayment({ recipientName: name, amount: transfer.cents / 100, currency: transfer.currency })}>Vraag om betaling</Button>}
              </div>
            </div>;
          })}
        </RowList> : <p className="py-3 text-sm text-muted-foreground">{expenses.length ? "Je hoeft niets te verrekenen." : "Nog geen gedeelde kosten."}</p>}
        {!readOnly && <Button className="mt-3 h-11 w-full sm:w-auto" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Bonnetje toevoegen</Button>}
      </section>

      <section className="border-t border-border py-5">
        <SectionLabel>Bonnetjes</SectionLabel>
        {!expensesQuery.isPending && !expensesQuery.isError && !expenses.length && <p className="py-3 text-sm text-muted-foreground">Niemand heeft nog kosten toegevoegd.</p>}
        <RowList>{expenses.map((expense) => {
          const manager = isOrganizer || expense.created_by === user.id;
          const isExpanded = expanded === expense.id;
          return <div key={expense.id} className="py-3">
            <Button variant="ghost" onClick={() => setExpanded(isExpanded ? null : expense.id)} aria-expanded={isExpanded} className="h-auto w-full justify-start gap-3 whitespace-normal px-0 py-1 text-left hover:bg-transparent">
              <div className="min-w-0 flex-1"><span className="block break-words text-[15px] font-medium">{expense.description}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Betaald door {names.get(expense.paid_by_user_id || "") || "nog te koppelen"}</span></div>
              <span className="num shrink-0 text-sm font-semibold">{money(expense.amount, expense.currency)}</span><ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground ${isExpanded ? "rotate-180" : ""}`} />
            </Button>
            {isExpanded && <div className="mt-3 border-l border-border pl-3">
              {expense.splits.map((split) => <div key={split.id} className="flex items-start justify-between gap-3 py-1 text-sm"><span className="min-w-0 break-words text-muted-foreground">{names.get(split.user_id || "") || "Medereiziger"}</span><span className="num shrink-0">{money(split.amount, expense.currency)}</span></div>)}
              {!readOnly && manager && <div className="mt-2 flex gap-2"><Button variant="outline" size="sm" onClick={() => { setEditing(expense); setSheetOpen(true); }}><Pencil className="mr-1.5 h-3.5 w-3.5" />Wijzigen</Button><Button variant="ghost" size="sm" onClick={() => void remove(expense)} className="text-destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Verwijderen</Button></div>}
            </div>}
          </div>;
        })}</RowList>
      </section>

      {expenses.length > 0 && <section className="border-t border-dashed border-border py-5">
        <SectionLabel>Wie betaalt wie</SectionLabel>
        {transfers.length === 0 ? <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><Check className="h-4 w-4" />Niemand hoeft iets te verrekenen.</p> : <>
          <RowList>{transfers.map((transfer) => <div key={`${transfer.currency}-${transfer.fromUserId}-${transfer.toUserId}`} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 py-3 text-sm"><span className="min-w-0 flex-1 break-words">{transfer.fromUserId === user.id ? "Jij" : names.get(transfer.fromUserId) || "Medereiziger"} betaalt {transfer.toUserId === user.id ? "jou" : names.get(transfer.toUserId) || "Medereiziger"}</span><span className="num shrink-0 font-semibold">{money(transfer.cents / 100, transfer.currency)}</span></div>)}</RowList>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />Overzicht kopiëren</Button>
        </>}
      </section>}
    </div>
    <ExpenseSheet open={sheetOpen} onOpenChange={setSheetOpen} tripId={tripId} tripCurrency={activeTrip.currency} currentUserId={user.id} members={members} expense={editing} onSaved={refresh} />
    <PaymentRequestSheet open={Boolean(payment)} onOpenChange={(open) => { if (!open) setPayment(null); }} recipientName={payment?.recipientName || ""} amount={payment?.amount || 0} currency={payment?.currency || activeTrip.currency} tripName={activeTrip.name} iban={detailsQuery.data?.iban} accountName={detailsQuery.data?.account_name} />
  </>;
}