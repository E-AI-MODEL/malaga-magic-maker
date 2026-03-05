import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Users, ArrowRight, Wallet } from "lucide-react";
import heroKosten from "@/assets/hero-kosten.jpg";

interface Profile { id: string; username: string; display_name: string; }
interface TaskWithCost {
  id: string; title: string; section: string;
  cost: number | null; paid_by: string | null;
  assigned_to: string | null;
}

export default function Kosten() {
  const [tasks, setTasks] = useState<TaskWithCost[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("tasks").select("id, title, section, cost, paid_by, assigned_to"),
      supabase.from("profiles").select("*"),
    ]).then(([t, p]) => {
      setTasks((t.data as any[]) || []);
      setProfiles((p.data as any[]) || []);
      setLoading(false);
    });
  }, []);

  const paidTasks = useMemo(() => tasks.filter(t => t.cost && t.cost > 0 && t.paid_by), [tasks]);
  const totalSpent = useMemo(() => paidTasks.reduce((sum, t) => sum + (t.cost || 0), 0), [paidTasks]);
  const participants = useMemo(() => profiles.filter(p => p.username !== "admin" && p.username !== "Admin"), [profiles]);
  const fairShare = participants.length > 0 ? totalSpent / participants.length : 0;

  // Per person: how much they paid
  const paidByPerson = useMemo(() => {
    const map: Record<string, number> = {};
    participants.forEach(p => { map[p.display_name] = 0; });
    paidTasks.forEach(t => {
      if (t.paid_by && map[t.paid_by] !== undefined) {
        map[t.paid_by] += t.cost || 0;
      }
    });
    return map;
  }, [paidTasks, participants]);

  // Settlements
  const settlements = useMemo(() => {
    if (participants.length === 0) return [];
    const balances = participants.map(p => ({
      name: p.display_name,
      balance: (paidByPerson[p.display_name] || 0) - fairShare,
    }));

    const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b, balance: Math.abs(b.balance) })).sort((a, b) => b.balance - a.balance);
    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

    const result: { from: string; to: string; amount: number }[] = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amount = Math.min(debtors[di].balance, creditors[ci].balance);
      if (amount > 0.01) {
        result.push({ from: debtors[di].name, to: creditors[ci].name, amount });
      }
      debtors[di].balance -= amount;
      creditors[ci].balance -= amount;
      if (debtors[di].balance < 0.01) di++;
      if (creditors[ci].balance < 0.01) ci++;
    }
    return result;
  }, [participants, paidByPerson, fairShare]);

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
                <p className="font-display font-extrabold text-2xl">€{fairShare.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Per persoon</p>
              </CardContent>
            </Card>
          </div>

          {/* Per person breakdown */}
          {participants.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Per persoon betaald</p>
              <div className="space-y-2">
                {participants.map(p => {
                  const paid = paidByPerson[p.display_name] || 0;
                  const diff = paid - fairShare;
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm font-medium">{p.display_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-display font-bold tabular-nums">€{paid.toFixed(0)}</span>
                        <Badge variant={diff >= 0 ? "default" : "destructive"} className="text-[10px] tabular-nums">
                          {diff >= 0 ? "+" : ""}€{diff.toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
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

          {/* Expense list */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Alle uitgaven</p>
            {paidTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nog geen uitgaven geregistreerd. Voeg kosten toe bij de taken op het dashboard.</p>
            ) : (
              <div className="space-y-2">
                {paidTasks.map(t => (
                  <Card key={t.id} className="border-border/60">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {sectionLabels[t.section] || t.section} · Betaald door {t.paid_by}
                          </p>
                        </div>
                        <span className="font-display font-extrabold text-sm text-primary">€{t.cost?.toFixed(0)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
