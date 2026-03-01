import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { computeGroupRules, rankAccommodations, type Accommodation, type Submission } from "@/lib/scoring";
import { CheckCircle2, XCircle, Unlock, Trash2, Undo2, Shield, Trophy } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

interface Override {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
}

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [p, s, a, o] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("submissions").select("*"),
      supabase.from("accommodations").select("*"),
      supabase.from("admin_overrides").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles((p.data as any[]) || []);
    setSubmissions((s.data as any[]) || []);
    setAccommodations((a.data as any[]) || []);
    setOverrides((o.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const rules = useMemo(() => computeGroupRules(submissions.filter(s => s.locked)), [submissions]);
  const ranked = useMemo(() => rankAccommodations(accommodations, submissions.filter(s => s.locked), rules), [accommodations, submissions, rules]);

  if (!isAdmin) return <AppLayout><p className="py-12 text-center text-destructive font-semibold">Geen toegang</p></AppLayout>;
  if (loading) return <AppLayout><div className="flex justify-center py-12 text-sm text-muted-foreground">Laden...</div></AppLayout>;

  const lockedSubs = submissions.filter(s => s.locked);
  const countVotes = (field: keyof Submission, value: any) => lockedSubs.filter(s => s[field] === value).length;

  const avgPoints = lockedSubs.length > 0 ? {
    "Golf": lockedSubs.reduce((s, sub) => s + sub.points_golf_ease, 0) / lockedSubs.length,
    "Strand": lockedSubs.reduce((s, sub) => s + sub.points_beach_life, 0) / lockedSubs.length,
    "Omgeving": lockedSubs.reduce((s, sub) => s + sub.points_exploring, 0) / lockedSubs.length,
    "Luxe": lockedSubs.reduce((s, sub) => s + sub.points_luxury, 0) / lockedSubs.length,
    "Budget": lockedSubs.reduce((s, sub) => s + sub.points_budget, 0) / lockedSubs.length,
    "Gedoe": lockedSubs.reduce((s, sub) => s + sub.points_low_hassle, 0) / lockedSubs.length,
  } : null;

  const handleEliminate = async (accId: string) => {
    const reason = prompt("Reden voor eliminatie:");
    if (!reason) return;
    await supabase.from("accommodations").update({ status: "eliminated", eliminated_reason: reason }).eq("id", accId);
    await logOverride("status", "active", "eliminated", reason);
    fetchAll();
    toast.success("Geëlimineerd");
  };

  const handleUndo = async (accId: string) => {
    await supabase.from("accommodations").update({ status: "active", eliminated_reason: null }).eq("id", accId);
    await logOverride("status", "eliminated", "active", "Undo eliminatie");
    fetchAll();
    toast.success("Hersteld");
  };

  const handleFinalist = async (accId: string) => {
    await supabase.from("accommodations").update({ status: "finalist" }).eq("id", accId);
    await logOverride("status", "active", "finalist", "Finalist geselecteerd");
    fetchAll();
    toast.success("Finalist!");
  };

  const handleTogglePrice = async (accId: string, current: boolean) => {
    await supabase.from("accommodations").update({ transparent_price_confirmed: !current }).eq("id", accId);
    await logOverride("transparent_price_confirmed", String(current), String(!current), "Toggle prijs bevestiging");
    fetchAll();
  };

  const handleUnlockSubmission = async (subId: string) => {
    await supabase.from("submissions").update({ locked: false }).eq("id", subId);
    await logOverride("submission_locked", "true", "false", "Admin unlock");
    fetchAll();
    toast.success("Submission unlocked");
  };

  const handleRunRound1 = async () => {
    let count = 0;
    for (const acc of ranked) {
      if (!acc.eligibility.eligible && acc.status === "active") {
        await supabase.from("accommodations").update({ status: "eliminated", eliminated_reason: acc.eligibility.failures.join("; ") }).eq("id", acc.id);
        count++;
      }
    }
    await logOverride("round_1_sloperhamer", "", `${count} eliminated`, "Ronde 1 uitgevoerd");
    fetchAll();
    toast.success(`Ronde 1: ${count} accommodaties geëlimineerd`);
  };

  const handleRunRound2 = async () => {
    await logOverride("round_2_scorebord", "", "Ranking berekend", "Ronde 2 uitgevoerd");
    toast.success("Ronde 2: Ranking is zichtbaar in de lijst");
  };

  const logOverride = async (field: string, oldValue: string | null, newValue: string | null, reason: string) => {
    if (!user) return;
    await supabase.from("admin_overrides").insert({
      admin_user_id: user.id,
      field, old_value: oldValue, new_value: newValue, reason,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Admin</p>
          <h2 className="font-display text-xl font-extrabold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Dashboard
          </h2>
        </div>

        {/* Completion */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completion</p>
          <div className="border rounded-lg divide-y">
            {profiles.filter(p => p.username !== "Admin").map(p => {
              const sub = submissions.find(s => s.user_id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between p-3">
                  <span className="text-sm font-medium">{p.display_name}</span>
                  <div className="flex items-center gap-2">
                    {sub?.locked ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUnlockSubmission(sub.id)}>
                          <Unlock className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : sub ? (
                      <span className="text-xs text-muted-foreground font-medium">Bezig</span>
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Majority view */}
        {lockedSubs.length > 0 && (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stemverdeling</p>
            <div className="space-y-4">
              <VoteRow label="Rondes" items={[{ label: "2 rondes", count: countVotes("preferred_rounds", 2) }, { label: "3 rondes", count: countVotes("preferred_rounds", 3) }]} total={lockedSubs.length} />
              <VoteRow label="Mobiliteit" items={[{ label: "Auto", count: countVotes("mobility_choice", "car") }, { label: "Taxi", count: countVotes("mobility_choice", "transfers") }, { label: "Neutraal", count: countVotes("mobility_choice", "neutral") }]} total={lockedSubs.length} />
              <VoteRow label="Base" items={[{ label: "Golf", count: countVotes("base_choice", "golf") }, { label: "Strand", count: countVotes("base_choice", "beach") }, { label: "Neutraal", count: countVotes("base_choice", "neutral") }]} total={lockedSubs.length} />
              <VoteRow label="Vaste bedden" items={[{ label: "Vereist", count: countVotes("require_fixed_beds", true) }, { label: "Niet", count: countVotes("require_fixed_beds", false) }]} total={lockedSubs.length} />
              <VoteRow label="3 slaapkamers" items={[{ label: "Vereist", count: countVotes("require_bedrooms_3", true) }, { label: "Niet", count: countVotes("require_bedrooms_3", false) }]} total={lockedSubs.length} />
              <VoteRow label="Annuleerbaar" items={[{ label: "Vereist", count: countVotes("require_cancelable", true) }, { label: "Niet", count: countVotes("require_cancelable", false) }]} total={lockedSubs.length} />
            </div>
          </section>
        )}

        {/* Average points */}
        {avgPoints && (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gemiddelde punten</p>
            <div className="border rounded-lg p-4">
              <div className="space-y-2">
                {Object.entries(avgPoints).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-16">{k}</span>
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${v}%` }} />
                    </div>
                    <span className="text-sm font-display font-bold tabular-nums w-8 text-right">{v.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Afvalrace controls */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Afvalrace controls</p>
          <div className="space-y-2">
            <Button onClick={handleRunRound1} variant="destructive" className="w-full font-semibold">Ronde 1: Sloperhamer</Button>
            <Button onClick={handleRunRound2} className="w-full font-semibold">Ronde 2: Scorebord</Button>
            <p className="text-xs text-muted-foreground text-center">Ronde 3: Selecteer finalisten hieronder</p>
          </div>
        </section>

        {/* Accommodations */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accommodaties ({ranked.length})</p>
          <div className="space-y-2">
            {ranked.map(acc => (
              <div key={acc.id} className={`border rounded-lg p-3 space-y-2 transition-opacity ${acc.status === "eliminated" ? "opacity-40" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{acc.name}</p>
                    <p className="text-[11px] text-muted-foreground">{acc.location_label} · {acc.bedrooms}k · {acc.fixed_beds_count}b · {acc.golf_minutes ?? "?"}m golf</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-display font-extrabold text-sm text-primary">{acc.totalScore.toFixed(0)}</span>
                    {acc.eligibility.eligible ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {acc.status === "finalist" && <Trophy className="h-4 w-4 text-warning" />}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {acc.status === "active" && (
                    <>
                      <Button size="sm" variant="destructive" className="h-7 text-[11px] px-2" onClick={() => handleEliminate(acc.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Elimineer
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => handleFinalist(acc.id)}>
                        <Trophy className="h-3 w-3 mr-1" /> Finalist
                      </Button>
                    </>
                  )}
                  {acc.status === "eliminated" && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => handleUndo(acc.id)}>
                      <Undo2 className="h-3 w-3 mr-1" /> Undo
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => handleTogglePrice(acc.id, acc.transparent_price_confirmed)}>
                    {acc.transparent_price_confirmed ? "✓ Prijs" : "Bevestig prijs"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Override log */}
        {overrides.length > 0 && (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Override log</p>
            <div className="border rounded-lg divide-y">
              {overrides.slice(0, 15).map(o => (
                <div key={o.id} className="p-3 text-xs space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{o.field}</span>
                    <span className="text-muted-foreground">{new Date(o.created_at).toLocaleString("nl-NL")}</span>
                  </div>
                  <p className="text-muted-foreground">{o.old_value} → {o.new_value}</p>
                  {o.reason && <p className="text-muted-foreground italic">{o.reason}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function VoteRow({ label, items, total }: { label: string; items: { label: string; count: number }[]; total: number }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-1.5">{label}</p>
      <div className="flex gap-1.5">
        {items.map(item => {
          const isMajority = item.count >= Math.ceil(total / 2);
          return (
            <div
              key={item.label}
              className={`flex-1 text-center rounded-md py-1.5 text-xs font-medium transition-colors ${
                isMajority
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {item.label} <span className="font-bold">{item.count}</span>/{total}
            </div>
          );
        })}
      </div>
    </div>
  );
}
