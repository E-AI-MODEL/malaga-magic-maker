import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Users, ArrowRight, Wallet, Plus, Trash2 } from "lucide-react";
import heroKosten from "@/assets/hero-kosten.jpg";
import { toast } from "sonner";

interface Profile { id: string; username: string; display_name: string; }
interface TaskWithCost {
  id: string; title: string; section: string;
  cost: number | null; paid_by: string | null;
  assigned_to: string | null; cost_split_among: string[] | null;
}
interface Expense {
  id: string; description: string; amount: number;
  paid_by: string; split_among: string[];
  created_by: string; created_at: string;
}

export default function Kosten() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithCost[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Form state
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newPaidBy, setNewPaidBy] = useState("");
  const [newSplitAmong, setNewSplitAmong] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    const [t, e, p] = await Promise.all([
      supabase.from("tasks").select("id, title, section, cost, paid_by, assigned_to, cost_split_among"),
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
    ]);
    setTasks((t.data as any[]) || []);
    setExpenses((e.data as any[]) || []);
    setProfiles((p.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const participants = useMemo(() => profiles.filter(p => p.username !== "admin" && p.username !== "Admin"), [profiles]);

  // Combine all cost items (tasks + expenses) into a unified list
  type CostItem = { id: string; label: string; amount: number; paid_by: string; split_among: string[]; source: "task" | "expense"; section?: string; };
  const allCostItems = useMemo<CostItem[]>(() => {
    const participantNames = participants.map(p => p.display_name);
    const taskItems: CostItem[] = tasks
      .filter(t => t.cost && t.cost > 0 && t.paid_by)
      .map(t => ({
        id: t.id,
        label: t.title,
        amount: t.cost!,
        paid_by: t.paid_by!,
        split_among: t.cost_split_among && t.cost_split_among.length > 0 ? t.cost_split_among : participantNames,
        source: "task" as const,
        section: t.section,
      }));
    const expenseItems: CostItem[] = expenses.map(e => ({
      id: e.id,
      label: e.description,
      amount: e.amount,
      paid_by: e.paid_by,
      split_among: e.split_among.length > 0 ? e.split_among : participantNames,
      source: "expense" as const,
    }));
    return [...taskItems, ...expenseItems];
  }, [tasks, expenses, participants]);

  const totalSpent = useMemo(() => allCostItems.reduce((sum, i) => sum + i.amount, 0), [allCostItems]);

  // Per person: how much they paid and how much they owe
  const balanceByPerson = useMemo(() => {
    const paid: Record<string, number> = {};
    const owes: Record<string, number> = {};
    participants.forEach(p => { paid[p.display_name] = 0; owes[p.display_name] = 0; });

    allCostItems.forEach(item => {
      if (paid[item.paid_by] !== undefined) {
        paid[item.paid_by] += item.amount;
      }
      const share = item.amount / item.split_among.length;
      item.split_among.forEach(name => {
        if (owes[name] !== undefined) {
          owes[name] += share;
        }
      });
    });

    return participants.map(p => ({
      name: p.display_name,
      paid: paid[p.display_name] || 0,
      owes: owes[p.display_name] || 0,
      balance: (paid[p.display_name] || 0) - (owes[p.display_name] || 0),
    }));
  }, [allCostItems, participants]);

  // Settlements
  const settlements = useMemo(() => {
    if (participants.length === 0) return [];
    const debtors = balanceByPerson.filter(b => b.balance < -0.01).map(b => ({ name: b.name, amount: Math.abs(b.balance) })).sort((a, b) => b.amount - a.amount);
    const creditors = balanceByPerson.filter(b => b.balance > 0.01).map(b => ({ name: b.name, amount: b.balance })).sort((a, b) => b.amount - a.amount);

    const result: { from: string; to: string; amount: number }[] = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amount = Math.min(debtors[di].amount, creditors[ci].amount);
      if (amount > 0.01) {
        result.push({ from: debtors[di].name, to: creditors[ci].name, amount });
      }
      debtors[di].amount -= amount;
      creditors[ci].amount -= amount;
      if (debtors[di].amount < 0.01) di++;
      if (creditors[ci].amount < 0.01) ci++;
    }
    return result;
  }, [balanceByPerson, participants]);

  const handleAddExpense = async () => {
    if (!user || !newDesc.trim() || !newAmount || !newPaidBy) {
      toast.error("Vul alle velden in");
      return;
    }
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Ongeldig bedrag");
      return;
    }
    const splitAmong = newSplitAmong.length > 0 ? newSplitAmong : participants.map(p => p.display_name);
    const { error } = await supabase.from("expenses").insert({
      description: newDesc.trim(),
      amount,
      paid_by: newPaidBy,
      split_among: splitAmong,
      created_by: user.id,
    } as any);
    if (error) {
      toast.error("Kon uitgave niet toevoegen");
    } else {
      toast.success("Uitgave toegevoegd");
      setNewDesc(""); setNewAmount(""); setNewPaidBy(""); setNewSplitAmong([]);
      setShowAddDialog(false);
      loadData();
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) { toast.success("Verwijderd"); loadData(); }
  };

  const sectionLabels: Record<string, string> = {
    transport: "Vervoer", accommodatie: "Accommodatie", golf: "Golf", strand: "Strand",
  };

  if (loading) return <AppLayout><div className="flex justify-center py-12 text-sm text-muted-foreground">Laden...</div></AppLayout>;

  return (
    <AppLayout>
      <div>
        {/* Hero header */}
        <section className="relative bg-foreground text-white overflow-hidden">
          <img src={heroKosten} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="relative px-6 py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">Financiën</p>
            <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Kostenoverzicht
            </h1>
            <p className="text-white/60 text-sm mt-1">Wie betaalt wat & verrekeningen</p>
          </div>
        </section>

        <div className="px-6 py-6 pb-24 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-center">
                <Wallet className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-display font-extrabold text-2xl text-primary">€{totalSpent.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Totaal uitgegeven</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="font-display font-extrabold text-2xl">
                  €{participants.length > 0 ? (totalSpent / participants.length).toFixed(0) : 0}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gem. per persoon</p>
              </CardContent>
            </Card>
          </div>

          {/* Per person breakdown */}
          {participants.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Per persoon</p>
              <div className="space-y-2">
                {balanceByPerson.map(b => (
                  <div key={b.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <span className="text-sm font-medium">{b.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">verschuldigd €{b.owes.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-display font-bold tabular-nums">€{b.paid.toFixed(0)}</span>
                      <Badge variant={b.balance >= 0 ? "default" : "destructive"} className="text-[10px] tabular-nums">
                        {b.balance >= 0 ? "+" : ""}€{b.balance.toFixed(0)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settlements */}
          {settlements.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Verrekeningen</p>
              <div className="space-y-2">
                {settlements.map((s, i) => (
                  <Card key={i} className="border-border/60">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">{s.from}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold">{s.to}</span>
                      </div>
                      <span className="font-display font-extrabold text-primary">€{s.amount.toFixed(2)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Add expense button */}
          {user && (
            <Button className="w-full gap-2" onClick={() => { setNewPaidBy(""); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4" /> Uitgave toevoegen
            </Button>
          )}

          {/* Expense list */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Alle uitgaven</p>
            {allCostItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nog geen uitgaven geregistreerd.</p>
            ) : (
              <div className="space-y-2">
                {allCostItems.map(item => (
                  <Card key={item.id} className="border-border/60">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.source === "task" ? (sectionLabels[item.section!] || item.section) + " · " : ""}
                            Betaald door {item.paid_by}
                            {item.split_among.length < participants.length && (
                              <span> · {item.split_among.length} deelnemers</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-extrabold text-sm text-primary">€{item.amount.toFixed(0)}</span>
                          {item.source === "expense" && user && (expenses.find(e => e.id === item.id)?.created_by === user.id) && (
                            <button onClick={() => handleDeleteExpense(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add expense dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Uitgave toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Omschrijving</label>
                <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Bijv. Diner dag 1" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Bedrag (€)</label>
                <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Betaald door</label>
                <Select value={newPaidBy} onValueChange={setNewPaidBy}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Kies..." /></SelectTrigger>
                  <SelectContent>
                    {participants.map(p => <SelectItem key={p.id} value={p.display_name}>{p.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Deelt mee in kosten</label>
                <div className="flex flex-wrap gap-1.5">
                  {participants.map(p => {
                    const allShare = newSplitAmong.length === 0;
                    const isSelected = allShare || newSplitAmong.includes(p.display_name);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`h-7 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                        }`}
                        onClick={() => {
                          if (allShare) {
                            setNewSplitAmong(participants.filter(pp => pp.display_name !== p.display_name).map(pp => pp.display_name));
                          } else if (isSelected) {
                            setNewSplitAmong(prev => prev.filter(n => n !== p.display_name));
                          } else {
                            setNewSplitAmong(prev => [...prev, p.display_name]);
                          }
                        }}
                      >
                        {p.display_name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">
                  {newSplitAmong.length === 0 ? "Iedereen deelt mee" : `${newSplitAmong.length} personen`}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleAddExpense}>Toevoegen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
