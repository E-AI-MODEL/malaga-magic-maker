import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createExpenseWithSplits, ExpenseBundle, TripMemberView, updateExpenseWithSplits } from "./data";
import { splitEvenly, splitTotal } from "./money";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripCurrency: string;
  currentUserId: string;
  members: TripMemberView[];
  expense?: ExpenseBundle | null;
  onSaved: () => void | Promise<void>;
};

const currencies = ["EUR", "USD", "GBP", "CHF"];

export function ExpenseSheet({ open, onOpenChange, tripId, tripCurrency, currentUserId, members, expense, onSaved }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(tripCurrency || "EUR");
  const [paidByUserId, setPaidByUserId] = useState(currentUserId);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDescription(expense?.description || "");
    setAmount(expense ? String(expense.amount) : "");
    setCurrency(expense?.currency || tripCurrency || "EUR");
    setPaidByUserId(expense?.paid_by_user_id || currentUserId);

    if (expense?.splits.length) {
      setSelectedUserIds(expense.splits.map((split) => split.user_id));
      setMode("custom");
      setCustomAmounts(Object.fromEntries(expense.splits.map((split) => [split.user_id, String(split.amount)])));
    } else {
      const initial = currentUserId ? [currentUserId] : members.slice(0, 1).map((member) => member.userId);
      setSelectedUserIds(initial);
      setMode("equal");
      setCustomAmounts({});
    }
    setError("");
  }, [open, expense, tripCurrency, currentUserId, members]);

  const numericAmount = Number(amount || 0);
  const splits = useMemo(() => {
    if (mode === "equal") return splitEvenly(numericAmount, selectedUserIds);
    return selectedUserIds.map((userId) => ({ user_id: userId, amount: Number(customAmounts[userId] || 0) }));
  }, [mode, numericAmount, selectedUserIds, customAmounts]);

  const splitSum = splitTotal(splits);
  const splitMatches = Math.round(splitSum * 100) === Math.round(numericAmount * 100);

  const toggleMember = (userId: string) => {
    setSelectedUserIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("Waar waren deze kosten voor?");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Vul een bedrag groter dan nul in.");
      return;
    }
    if (!paidByUserId || selectedUserIds.length === 0) {
      setError("Kies wie betaalde en over wie de kosten worden verdeeld.");
      return;
    }
    if (splits.some((split) => !Number.isFinite(split.amount) || split.amount < 0) || !splitMatches) {
      setError("De verdeling moet precies gelijk zijn aan het totaalbedrag.");
      return;
    }

    setSaving(true);
    try {
      const input = {
        description: description.trim(),
        amount: numericAmount,
        paidByUserId,
        currency,
        splits,
      };
      if (expense) await updateExpenseWithSplits(expense.id, input);
      else await createExpenseWithSplits(tripId, input);
      await onSaved();
      onOpenChange(false);
    } catch (caught) {
      console.error("expense save failed", caught);
      setError("De kosten konden niet worden opgeslagen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-5 pb-8 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl font-extrabold">{expense ? "Kosten wijzigen" : "Kosten toevoegen"}</SheetTitle>
          <SheetDescription>Leg vast wie betaalde en hoe jullie het bedrag verdelen.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-semibold" htmlFor="expense-description">Waarvoor? *</label>
            <Input id="expense-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Bijv. Treinkaartjes" className="mt-2 h-11" autoFocus />
          </div>

          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div>
              <label className="text-sm font-semibold" htmlFor="expense-amount">Bedrag *</label>
              <Input id="expense-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 h-11" />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="expense-currency">Valuta</label>
              <select id="expense-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                {currencies.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="expense-payer">Wie betaalde?</label>
            <select id="expense-payer" value={paidByUserId} onChange={(event) => setPaidByUserId(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
              {members.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}
            </select>
          </div>

          <div>
            <p className="text-sm font-semibold">Verdelen over</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {members.map((member) => (
                <label key={member.userId} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
                  <input type="checkbox" checked={selectedUserIds.includes(member.userId)} onChange={() => toggleMember(member.userId)} className="h-4 w-4" />
                  <span className="truncate">{member.displayName}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Hoe verdelen?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode("equal")} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${mode === "equal" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Gelijk verdelen</button>
              <button type="button" onClick={() => setMode("custom")} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${mode === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Zelf bedragen</button>
            </div>
          </div>

          {selectedUserIds.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-secondary/50 p-4">
              {selectedUserIds.map((userId) => {
                const member = members.find((item) => item.userId === userId);
                const equalAmount = splits.find((split) => split.user_id === userId)?.amount || 0;
                return (
                  <div key={userId} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm">{member?.displayName || "Medereiziger"}</span>
                    {mode === "equal" ? (
                      <span className="font-mono text-sm font-semibold">{equalAmount.toFixed(2)} {currency}</span>
                    ) : (
                      <Input type="number" min="0" step="0.01" value={customAmounts[userId] || ""} onChange={(event) => setCustomAmounts((current) => ({ ...current, [userId]: event.target.value }))} className="h-9 w-32 text-right" />
                    )}
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                <span>Totaal verdeeld</span>
                <span className={splitMatches ? "text-foreground" : "text-destructive"}>{splitSum.toFixed(2)} {currency}</span>
              </div>
            </div>
          )}

          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full font-bold" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {expense ? "Wijzigingen opslaan" : "Kosten toevoegen"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
