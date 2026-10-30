import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormField, FormSelect, FormSheet, FormSubmit } from "@/components/FormSheet";
import { createExpenseWithSplits, ExpenseBundle, TripMemberView, updateExpenseWithSplits } from "./data";
import { splitEvenly, splitTotal } from "./money";
import { ReceiptInput } from "./ReceiptInput";
import { matchReceiptPayer, type ReceiptSuggestion } from "./receipt";

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
  const [proposalReceived, setProposalReceived] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [receiptNote, setReceiptNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!open) {
      setDescription(""); setAmount(""); setPaidByUserId(""); setCurrency("");
      setCustomAmounts({}); setSelectedUserIds([]); setReceiptNote(""); setProposalReceived(false); setReviewed(false); setShowDetails(false);
      return;
    }
    setDescription(expense?.description || "");
    setAmount(expense ? String(expense.amount) : "");
    setCurrency(expense?.currency || tripCurrency || "EUR");
    setPaidByUserId(expense?.paid_by_user_id || currentUserId);

    if (expense?.splits.length) {
      setSelectedUserIds(expense.splits.map((split) => split.user_id));
      setMode("custom");
      setCustomAmounts(Object.fromEntries(expense.splits.map((split) => [split.user_id, String(split.amount)])));
    } else {
      // Nieuw bonnetje: standaard verdeeld over alle reizigers, betaald door jezelf.
      setSelectedUserIds(members.length ? members.map((member) => member.userId) : currentUserId ? [currentUserId] : []);
      setMode("equal");
      setCustomAmounts({});
    }
    setError("");
    setProposalReceived(false); setReviewed(false); setReceiptNote("");
  }, [open, expense, tripCurrency, currentUserId, members]);

  const applyProposal = (proposal: ReceiptSuggestion) => {
    setDescription(proposal.description || "");
    setAmount(proposal.amount === null ? "" : String(proposal.amount));
    setCurrency(proposal.currency || "");
    setPaidByUserId(matchReceiptPayer(proposal.payerName, members) || "");
    setProposalReceived(true); setReviewed(false);
    setReceiptNote(proposal.date ? `Datum op de bon: ${proposal.date}. Controleer de gegevens hieronder.` : "Controleer de gegevens hieronder en vul aan wat ontbreekt.");
    setError("");
  };

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
    if (saving) return;
    if (proposalReceived && !reviewed) { setError("Controleer het voorstel en bevestig de gegevens voordat je opslaat."); return; }
    if (!currency || !/^[A-Z]{3}$/.test(currency)) { setError("Kies de valuta van de bon."); return; }

    if (!description.trim()) {
      setError("Waar waren deze kosten voor?");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Vul een bedrag groter dan nul in.");
      return;
    }
    if (!members.some((member) => member.userId === paidByUserId) || selectedUserIds.length === 0 || selectedUserIds.some((id) => !members.some((member) => member.userId === id))) {
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
    } catch {
      setError("De kosten konden niet worden opgeslagen.");
    } finally {
      setSaving(false);
    }
  };

  const payerName = members.find((member) => member.userId === paidByUserId)?.displayName;
  const everyone = selectedUserIds.length === members.length;
  const summary = `${paidByUserId === currentUserId ? "Jij betaalde" : `${payerName || "Onbekend"} betaalde`} · ${everyone ? (members.length === 1 ? "alleen voor jou" : `gelijk over iedereen (${members.length})`) : `over ${selectedUserIds.length} ${selectedUserIds.length === 1 ? "persoon" : "personen"}`}`;
  const detailsVisible = showDetails || Boolean(expense) || proposalReceived;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? "Kosten wijzigen" : "Bonnetje toevoegen"}
    >
      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        {open && !expense && <ReceiptInput tripId={tripId} onProposal={applyProposal} />}
        {proposalReceived && <p role="status" className="text-sm text-muted-foreground">Voorstel uit je bonnetje. {receiptNote}</p>}

        <div className="grid grid-cols-[1fr_96px] items-end gap-3">
          <FormField label="Bedrag" htmlFor="expense-amount" required>
            <Input id="expense-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className="num h-16 font-display text-4xl font-semibold" autoFocus={!expense} />
          </FormField>
          <FormField label="Valuta" htmlFor="expense-currency">
            <FormSelect
              id="expense-currency"
              value={currency}
              onChange={setCurrency}
              options={[{ value: "", label: "Kies" }, ...[...new Set([...currencies, tripCurrency, currency].filter(Boolean))].map((item) => ({ value: item, label: item }))]}
            />
          </FormField>
        </div>

        <FormField label="Waarvoor?" htmlFor="expense-description" required>
          <Input id="expense-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Bijv. boodschappen" className="h-12" />
        </FormField>

        {!detailsVisible && (
          <button type="button" onClick={() => setShowDetails(true)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left text-[15px]">
            <span className="min-w-0">{summary}</span>
            <span className="shrink-0 text-sm font-semibold underline underline-offset-4">Aanpassen</span>
          </button>
        )}

        {detailsVisible && <>
        <FormField label="Wie betaalde?" htmlFor="expense-payer">
          <FormSelect
            id="expense-payer"
            value={paidByUserId}
            onChange={setPaidByUserId}
            options={[{ value: "", label: "Kies een reiziger" }, ...members.map((member) => ({ value: member.userId, label: member.displayName }))]}
          />
        </FormField>

        <div>
          <p className="text-sm font-semibold">Voor wie?</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {members.map((member) => (
              <label key={member.userId} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
                <input type="checkbox" checked={selectedUserIds.includes(member.userId)} onChange={() => toggleMember(member.userId)} className="h-5 w-5" />
                <span className="truncate">{member.displayName}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Verdelen</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode("equal")} className={`min-h-12 rounded-xl border px-3 py-3 text-[15px] font-semibold ${mode === "equal" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Gelijk verdelen</button>
            <button type="button" onClick={() => setMode("custom")} className={`min-h-12 rounded-xl border px-3 py-3 text-[15px] font-semibold ${mode === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Zelf verdelen</button>
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
        </>}

        <FormError message={error} />
        {proposalReceived && <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-3 text-sm"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" /><span>Ik heb alles gecontroleerd.</span></label>}
        <FormSubmit saving={saving}>{expense ? "Wijzigingen opslaan" : "Opslaan"}</FormSubmit>
      </form>
    </FormSheet>
  );
}
