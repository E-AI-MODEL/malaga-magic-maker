import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Check, Send, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/primitives";
import { ExpenseWizard } from "@/features/together/ExpenseWizard";
import { PaymentRequestSheet } from "@/features/together/PaymentRequestSheet";
import { formatExpenseMoney as money } from "@/features/together/settlement";
import {
  GUEST_FREE_EXPENSES,
  GUEST_SELF_ID,
  addGuestExpense,
  addGuestPerson,
  guestTransfers,
  guestUsesLeft,
  loadGuestKnaakie,
  removeGuestExpense,
  removeGuestPerson,
  saveGuestKnaakie,
  type GuestKnaakie,
} from "@/features/knaakie-guest/store";
import { BrandLogo } from "@/components/BrandLogo";


export default function KnaakieGuest() {
  const [state, setState] = useState<GuestKnaakie>(() => loadGuestKnaakie());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [payment, setPayment] = useState<{ recipientName: string; amount: number; currency: string } | null>(null);
  useEffect(() => { saveGuestKnaakie(state); }, [state]);

  const names = useMemo(() => new Map(state.people.map((p) => [p.id, p.name])), [state.people]);
  const transfers = useMemo(() => guestTransfers(state), [state]);
  const mine = transfers.filter((t) => t.fromUserId === GUEST_SELF_ID || t.toUserId === GUEST_SELF_ID);
  const others = transfers.filter((t) => t.fromUserId !== GUEST_SELF_ID && t.toUserId !== GUEST_SELF_ID);
  const balances = [...new Set(transfers.map((t) => t.currency))].map((currency) => ({
    currency,
    cents: transfers.filter((t) => t.currency === currency).reduce((sum, t) => sum + (t.toUserId === GUEST_SELF_ID ? t.cents : t.fromUserId === GUEST_SELF_ID ? -t.cents : 0), 0),
  })).filter((b) => b.cents !== 0);
  const left = guestUsesLeft(state);
  const label = (id: string) => (id === GUEST_SELF_ID ? "jou" : names.get(id) || "onbekend");

  const addPerson = (event: FormEvent) => {
    event.preventDefault();
    setState((current) => addGuestPerson(current, newName));
    setNewName("");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-5">
          <Link to="/" aria-label="Naar de homepage"><BrandLogo /></Link>
          <Button asChild variant="ghost" size="sm" className="rounded-md"><Link to="/login">Inloggen</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 pb-16 pt-6">
        <h1 className="font-display text-[40px] font-bold leading-none">Knaakie</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Houd bij wie wat betaalt: met vrienden, huisgenoten of op reis. Zonder account, op dit apparaat.</p>

        <label className="mt-5 block">
          <span className="text-sm font-semibold">Geef deze kosten een naam</span>
          <Input value={state.name} maxLength={80} placeholder="Bijvoorbeeld etentje, huisfeest of weekend weg" onChange={(e) => setState((c) => ({ ...c, name: e.target.value }))} className="mt-2 h-12 text-base" />
        </label>

        <section className="tile-knaakie mt-5 overflow-hidden rounded-[1.75rem] px-5 pb-5 pt-6 text-on-image" aria-live="polite">
          {!state.expenses.length ? <><p className="font-display text-4xl font-semibold leading-none">Nog geen kosten</p><p className="mt-2 text-[15px] opacity-75">Iets betaald voor de groep? Maak een foto van je bonnetje.</p></>
            : !balances.length ? <><p className="text-[15px] opacity-75">Iedereen is rond</p><p className="mt-1 flex items-center gap-2 font-display text-5xl font-semibold leading-none"><Check className="h-9 w-9" strokeWidth={2.5} />Quitte</p></>
            : balances.map((b) => <div key={b.currency} className="py-1">
              <p className="text-[15px] opacity-75">{b.cents > 0 ? "Je krijgt nog" : "Je moet nog betalen"}</p>
              <p className={`num font-display text-6xl font-semibold leading-none tracking-tight `}>{money(Math.abs(b.cents) / 100, b.currency)}</p>
            </div>)}
          {left > 0
            ? <Button variant="secondary" className="mt-6 h-16 w-full rounded-full font-display text-lg font-semibold [&_svg]:size-6" onClick={() => setSheetOpen(true)}><Camera className="mr-2.5 h-6 w-6" strokeWidth={2} />Bonnetje toevoegen</Button>
            : <Button asChild variant="secondary" className="mt-6 h-16 w-full rounded-full font-display text-lg font-semibold [&_svg]:size-6"><Link to="/signup">Gratis account maken<ArrowRight className="ml-2.5 h-6 w-6" /></Link></Button>}
          <p className="mt-3 text-sm opacity-70">
            {left > 0 ? `Nog ${left} ${left === 1 ? "uitgave" : "uitgaven"} gratis zonder account.` : `Je hebt ${GUEST_FREE_EXPENSES} uitgaven toegevoegd. Maak een gratis account om verder te gaan; je kosten gaan mee.`}
          </p>
        </section>

        <section className="py-5">
          <SectionLabel>Voeg toe wie meedoet</SectionLabel>
          <ul className="flex flex-wrap gap-2">
            {state.people.map((p) => {
              const locked = p.id === GUEST_SELF_ID || state.expenses.some((e) => e.paidBy === p.id || e.splitAmong.includes(p.id));
              return <li key={p.id} className="flex h-11 items-center gap-1 rounded-full border border-border bg-card pl-4 pr-2 text-[15px]">
                {p.name}
                {!locked ? <button type="button" aria-label={`${p.name} weghalen`} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" onClick={() => setState((c) => removeGuestPerson(c, p.id))}><X className="h-4 w-4" /></button> : <span className="w-2" />}
              </li>;
            })}
          </ul>
          <form onSubmit={addPerson} className="mt-3 flex gap-2">
            <Input aria-label="Naam" value={newName} maxLength={40} placeholder="Naam" onChange={(e) => setNewName(e.target.value)} className="h-12 flex-1 text-base" />
            <Button type="submit" variant="secondary" className="h-12 rounded-xl px-4" disabled={!newName.trim()}><UserPlus className="mr-1.5 h-5 w-5" />Toevoegen</Button>
          </form>
        </section>

        {mine.length > 0 && <section className="border-t border-border py-5">
          <SectionLabel>Jouw bedragen</SectionLabel>
          <div className="space-y-2.5">
            {mine.map((t) => {
              const pay = t.fromUserId === GUEST_SELF_ID;
              const name = names.get(pay ? t.toUserId : t.fromUserId) || "Iemand";
              return <div key={`${t.currency}-${t.fromUserId}-${t.toUserId}`} className="tile-plain rounded-[1.5rem] bg-card p-4">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-xl font-semibold">{name.charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[15px] text-muted-foreground">{pay ? `Jij betaalt ${name}` : `${name} betaalt jou`}</p>
                    <p className="num font-display text-3xl font-semibold leading-tight">{money(t.cents / 100, t.currency)}</p>
                  </div>
                </div>
                {!pay && <Button variant="secondary" className="mt-3 h-14 w-full rounded-xl text-base font-semibold [&_svg]:size-5" onClick={() => setPayment({ recipientName: name, amount: t.cents / 100, currency: t.currency })}><Send className="mr-2 h-5 w-5" />Betaalverzoek sturen</Button>}
              </div>;
            })}
          </div>
        </section>}

        {others.length > 0 && <section className="border-t border-border py-5">
          <SectionLabel>Tussen de anderen</SectionLabel>
          {others.map((t) => <p key={`${t.currency}-${t.fromUserId}-${t.toUserId}`} className="flex justify-between gap-3 py-2 text-sm"><span>{names.get(t.fromUserId)} betaalt {names.get(t.toUserId)}</span><span className="num font-semibold">{money(t.cents / 100, t.currency)}</span></p>)}
        </section>}

        {state.expenses.length > 0 && <section className="border-t border-border py-5">
          <SectionLabel>Bonnetjes</SectionLabel>
          <ul className="rule-divide">
            {state.expenses.map((e) => <li key={e.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1"><span className="block break-words text-[15px] font-medium">{e.description}</span><span className="mt-0.5 block text-xs text-muted-foreground">Betaald door {label(e.paidBy)} · gedeeld door {e.splitAmong.length}</span></span>
              <span className="num shrink-0 text-sm font-semibold">{money(e.amount, e.currency)}</span>
              <button type="button" aria-label={`${e.description} verwijderen`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" onClick={() => setState((c) => removeGuestExpense(c, e.id))}><Trash2 className="h-4 w-4" /></button>
            </li>)}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Verwijderen geeft geen gratis uitgave terug.</p>
        </section>}

        <section className="tile-plain mt-4 rounded-[1.75rem] bg-card p-5">
          <p className="font-display text-[22px] font-bold leading-tight">Bewaar je kosten en deel ze</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Met een gratis account worden je kosten bewaard. Je nodigt de anderen uit, zodat iedereen hetzelfde ziet.</p>
          <Button asChild size="lg" className="mt-4 h-14 w-full rounded-xl font-display text-lg font-semibold"><Link to="/signup">Gratis account maken</Link></Button>
          <Link to="/login" className="mt-3 block text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">Ik heb al een account</Link>
        </section>
      </main>

      <ExpenseWizard open={sheetOpen} onOpenChange={setSheetOpen} tripId={null} selfId={GUEST_SELF_ID} defaultCurrency={state.expenses[0]?.currency || "EUR"}
        people={state.people} onAddPerson={(name) => setState((c) => addGuestPerson(c, name))}
        onSave={(input) => setState((c) => addGuestExpense(c, input))} />
      {payment && <PaymentRequestSheet open onOpenChange={(open) => !open && setPayment(null)} recipientName={payment.recipientName} tripName={state.name.trim() || "ons uitje"} amount={payment.amount} currency={payment.currency} />}
    </div>
  );
}
