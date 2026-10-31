import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, Check, ImagePlus, Loader2, PenLine, Plus, Sparkles, UserPlus } from "lucide-react";
import { StepSheet } from "@/components/steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatExpenseMoney as money } from "./settlement";
import { prepareReceiptImage } from "./receipt-image";
import { recognizeReceipt } from "./receipt-client";

export type WizardPerson = { id: string; name: string };
export type WizardResult = { description: string; amount: number; currency: string; paidBy: string; splitAmong: string[] };
export type WizardStep = "start" | "amount" | "what" | "payer" | "split" | "summary";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = visitor without an account. */
  tripId: string | null;
  people: WizardPerson[];
  selfId: string;
  defaultCurrency: string;
  onSave: (result: WizardResult) => Promise<void> | void;
  /** Only Knaakie without an account can add people from inside the steps. */
  onAddPerson?: (name: string) => void;
};

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];
const QUICK_WHAT = ["Eten", "Drinken", "Boodschappen", "Vervoer", "Tanken", "Verblijf", "Uitje"];

/** Order of the steps; payer/split only when there is someone to choose. */
export function wizardSteps(peopleCount: number, canAddPeople: boolean): WizardStep[] {
  const steps: WizardStep[] = ["start", "amount", "what"];
  if (peopleCount > 1) steps.push("payer");
  if (peopleCount > 1 || canAddPeople) steps.push("split");
  steps.push("summary");
  return steps;
}

/** After reading a bonnetje: skip straight to the summary when amount and description are known. */
export function stepAfterProposal(amount: number | null, description: string | null): WizardStep {
  if (!amount) return "amount";
  if (!description?.trim()) return "what";
  return "summary";
}

const parseAmount = (value: string) => Number(value.replace(/\s/g, "").replace(",", "."));

export function ExpenseWizard({ open, onOpenChange, tripId, people, selfId, defaultCurrency, onSave, onAddPerson }: Props) {
  const steps = wizardSteps(people.length, Boolean(onAddPerson));
  const [step, setStep] = useState<WizardStep>("start");
  const [backToSummary, setBackToSummary] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState(selfId);
  const [split, setSplit] = useState<string[]>([]);
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    pending.current?.abort();
    if (!open) return;
    setStep("start"); setBackToSummary(false); setAmount(""); setCurrency(defaultCurrency || "EUR"); setDescription("");
    setPaidBy(selfId); setSplit(people.map((p) => p.id)); setImage(""); setBusy(false); setNote(""); setError(""); setNewName(""); setSaving(false);
    // Reset only when the sheet opens; the image is never kept after closing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Newly added people join the split automatically.
  const peopleKey = people.map((p) => p.id).join("|");
  const seen = useRef(peopleKey);
  useEffect(() => {
    if (seen.current === peopleKey) return;
    const before = new Set(seen.current.split("|"));
    seen.current = peopleKey;
    setSplit((current) => [...current, ...people.filter((p) => !before.has(p.id)).map((p) => p.id)]);
  }, [peopleKey, people]);

  const value = parseAmount(amount);
  const amountValid = Number.isFinite(value) && value > 0 && value <= 1000000 && /^[A-Z]{3}$/.test(currency);
  const valid: Record<WizardStep, boolean> = {
    start: true, amount: amountValid, what: Boolean(description.trim()), payer: people.some((p) => p.id === paidBy), split: split.length > 0, summary: true,
  };
  const index = steps.indexOf(step);
  const go = (target: WizardStep) => { setError(""); setStep(target); };
  const next = () => {
    if (!valid[step]) return;
    if (backToSummary) { setBackToSummary(false); go("summary"); return; }
    go(steps[Math.min(index + 1, steps.length - 1)]);
  };
  const back = () => { if (index > 0) go(steps[index - 1]); };
  const edit = (target: WizardStep) => { setBackToSummary(true); go(target); };
  const name = (id: string) => (id === selfId ? "Jij" : people.find((p) => p.id === id)?.name || "Onbekend");

  const choose = async (file?: File) => {
    pending.current?.abort();
    setImage(""); setError("");
    if (!file) return;
    setBusy(true);
    try { setImage(await prepareReceiptImage(file)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Deze foto werkt niet."); }
    finally { setBusy(false); }
  };
  const read = async () => {
    if (!image || busy) return;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError("");
    try {
      const proposal = await recognizeReceipt(tripId, image, controller.signal);
      if (controller.signal.aborted) return;
      if (proposal.amount) setAmount(String(proposal.amount).replace(".", ","));
      if (proposal.description) setDescription(proposal.description);
      if (proposal.currency) setCurrency(proposal.currency);
      const payer = proposal.payerName && people.find((p) => p.name.toLocaleLowerCase("nl-NL") === proposal.payerName!.trim().toLocaleLowerCase("nl-NL"));
      if (payer) setPaidBy(payer.id);
      setNote(proposal.date ? `Uit je bonnetje gehaald, datum ${new Date(`${proposal.date}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}. Check de gegevens.` : "Uit je bonnetje gehaald. Check de gegevens.");
      setImage("");
      const target = stepAfterProposal(proposal.amount, proposal.description);
      if (target === "summary") go("summary"); else { setBackToSummary(false); go(target); }
      if (target !== "summary") setError("Niet alles was leesbaar. Vul de rest zelf in.");
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "De foto lezen lukte niet. Vul het zelf in.");
    } finally { if (!controller.signal.aborted) setBusy(false); pending.current = null; }
  };
  const save = async () => {
    if (saving || !steps.every((s) => valid[s])) return;
    setSaving(true); setError("");
    try {
      await onSave({ description: description.trim(), amount: Math.round(value * 100) / 100, currency, paidBy, splitAmong: split });
      onOpenChange(false);
    } catch { setError("Opslaan lukte niet. Probeer het opnieuw."); }
    finally { setSaving(false); }
  };
  const addPerson = (event: FormEvent) => { event.preventDefault(); if (newName.trim() && onAddPerson) { onAddPerson(newName); setNewName(""); } };


  const tile = "flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-5 text-left text-lg font-semibold transition-colors hover:bg-secondary active:bg-secondary";
  const bigNext = (label = "Volgende") => <Button type="button" className="h-16 w-full rounded-2xl font-display text-xl font-semibold [&_svg]:size-6" disabled={!valid[step]} onClick={next}>{backToSummary ? "Klaar" : label}<ArrowRight className="ml-2" /></Button>;
  const question = (text: string) => <h3 className="font-display text-[32px] font-bold leading-tight">{text}</h3>;

  return (
    <StepSheet open={open} onOpenChange={onOpenChange} title="Bonnetje toevoegen" total={steps.length} index={index} onBack={back} onSwipeNext={step !== "start" && step !== "summary" && !busy ? next : undefined}>

          {step === "start" && <div className="space-y-3">
            {question("Voeg je bonnetje toe")}
            {!image ? <>
              <button type="button" className={`${tile} mt-3 h-24 border-foreground bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/90`} disabled={busy} onClick={() => cameraRef.current?.click()}><Camera className="h-8 w-8 shrink-0" />Maak een foto</button>
              <button type="button" className={`${tile} h-20`} disabled={busy} onClick={() => fileRef.current?.click()}><ImagePlus className="h-7 w-7 shrink-0" />Kies een foto</button>
              <button type="button" className={`${tile} h-20`} disabled={busy} onClick={() => go("amount")}><PenLine className="h-7 w-7 shrink-0" />Vul zelf in</button>
              {busy && <p className="flex items-center gap-2 text-[15px] text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Foto klaarzetten…</p>}
            </> : <>
              <img src={image} alt="Je bonnetje" className="mt-3 max-h-[38dvh] w-full rounded-2xl bg-secondary object-contain" />
              <Button type="button" className="h-16 w-full rounded-2xl font-display text-xl font-semibold [&_svg]:size-6" disabled={busy} onClick={() => void read()}>{busy ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}{busy ? "AI leest je bonnetje…" : "Laat AI het uitlezen"}</Button>
              <p className="text-center text-sm text-muted-foreground">De foto wordt nergens bewaard.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => { pending.current?.abort(); setBusy(false); setImage(""); }}>Kies andere foto</Button>
                <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => { pending.current?.abort(); setBusy(false); setImage(""); go("amount"); }}>Vul zelf in</Button>
              </div>
            </>}
            <input ref={fileRef} aria-label="Kies bonfoto" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
            <input ref={cameraRef} aria-label="Maak bonfoto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
          </div>}

          {step === "amount" && <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); next(); }}>
            {question("Vul het bedrag in")}
            <Input aria-label="Bedrag" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="num h-24 rounded-2xl border-2 text-center font-display !text-6xl font-semibold" />
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Valuta">
              {[...new Set([...CURRENCIES, defaultCurrency, currency].filter(Boolean))].map((c) => <button key={c} type="button" aria-pressed={c === currency} onClick={() => setCurrency(c)} className={`h-11 min-w-16 rounded-full border px-4 text-[15px] font-semibold ${c === currency ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}>{c}</button>)}
            </div>
            {bigNext()}
          </form>}

          {step === "what" && <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); next(); }}>
            {question("Kies waarvoor")}
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_WHAT.map((w) => <button key={w} type="button" onClick={() => { setDescription(w); if (backToSummary) { setBackToSummary(false); go("summary"); } else go(steps[index + 1]); }} className={`h-16 rounded-2xl border text-lg font-semibold ${description === w ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}>{w}</button>)}
            </div>
            <Input aria-label="Waarvoor" value={description} maxLength={160} onChange={(e) => setDescription(e.target.value)} placeholder="Of typ het in" className="h-14 rounded-2xl text-lg" />
            {bigNext()}
          </form>}

          {step === "payer" && <div className="space-y-3">
            {question("Kies wie betaalde")}
            {people.map((p) => <button key={p.id} type="button" onClick={() => { setPaidBy(p.id); if (backToSummary) { setBackToSummary(false); go("summary"); } else go(steps[index + 1]); }} className={`${tile} h-20 ${paidBy === p.id ? "border-foreground" : ""}`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-xl">{name(p.id).charAt(0).toUpperCase()}</span>{name(p.id)}{paidBy === p.id && <Check className="ml-auto h-6 w-6" />}
            </button>)}
          </div>}

          {step === "split" && <div className="space-y-3">
            {question(people.length > 1 ? "Kies met wie je deelt" : "Deel het met anderen")}
            {people.length > 1 && <button type="button" onClick={() => { setSplit(people.map((p) => p.id)); if (backToSummary) { setBackToSummary(false); go("summary"); } else go(steps[index + 1]); }} className={`${tile} h-20 border-foreground bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/90`}><Check className="h-7 w-7 shrink-0" />Deel gelijk met iedereen ({people.length})</button>}
            {people.length === 1 && <button type="button" onClick={() => { setSplit([selfId]); next(); }} className={`${tile} h-20`}><Check className="h-7 w-7 shrink-0" />Alleen voor mij</button>}
            {people.length > 1 && <p className="pt-2 text-sm font-semibold text-muted-foreground">Of kies zelf wie meedoet</p>}
            {people.length > 1 && <div className="flex flex-wrap gap-2">
              {people.map((p) => { const on = split.includes(p.id); return <button key={p.id} type="button" aria-pressed={on} onClick={() => setSplit((s) => (on ? s.filter((id) => id !== p.id) : [...s, p.id]))} className={`flex h-12 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold ${on ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}>{on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{name(p.id)}</button>; })}
            </div>}
            {onAddPerson && <form onSubmit={addPerson} className="flex gap-2 pt-2">
              <Input aria-label="Naam toevoegen" value={newName} maxLength={40} onChange={(e) => setNewName(e.target.value)} placeholder="Naam" className="h-12 flex-1 rounded-xl text-base" />
              <Button type="submit" variant="secondary" className="h-12 rounded-xl px-4" disabled={!newName.trim()}><UserPlus className="mr-1.5 h-5 w-5" />Toevoegen</Button>
            </form>}
            {people.length > 1 && <div className="pt-3">{bigNext()}</div>}
          </div>}

          {step === "summary" && <div className="space-y-5">
            {question("Check en sla op")}
            {note && <p className="flex items-start gap-2 text-[15px] text-muted-foreground"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" />{note}</p>}
            <div className="overflow-hidden rounded-3xl bg-foreground text-background">
              <button type="button" onClick={() => edit("amount")} className="block w-full px-5 pb-4 pt-5 text-left">
                <span className="block text-sm opacity-70">Bedrag · tik om aan te passen</span>
                <span className="num block font-display text-6xl font-semibold leading-none">{amountValid ? money(value, currency) : "—"}</span>
              </button>
            </div>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {([["what", "Waarvoor", description || "—"], ...(steps.includes("payer") ? [["payer", "Betaald door", name(paidBy)]] : []), ...(steps.includes("split") ? [["split", "Gedeeld door", split.length === people.length && people.length > 1 ? `Iedereen (${people.length})` : split.map(name).join(", ")]] : [])] as Array<[WizardStep, string, string]>).map(([target, label, text]) => (
                <li key={target}><button type="button" onClick={() => edit(target)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">{label}</span><span className="block break-words text-[17px] font-semibold">{text}</span></span>
                  <span className="text-sm font-semibold underline underline-offset-4">Wijzig</span>
                </button></li>
              ))}
            </ul>
            <Button type="button" className="h-16 w-full rounded-2xl font-display text-xl font-semibold [&_svg]:size-6" disabled={saving || !steps.every((s) => valid[s])} onClick={() => void save()}>{saving ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}Opslaan</Button>
          </div>}

          {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
    </StepSheet>
  );
}
