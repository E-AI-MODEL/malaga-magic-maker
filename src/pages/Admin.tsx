import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { computeGroupRules, rankAccommodations, type Accommodation, type Submission } from "@/lib/scoring";
import { CheckCircle2, XCircle, Unlock, Trash2, Undo2, Shield } from "lucide-react";

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
  if (loading) return <AppLayout><div className="flex justify-center py-12">Laden...</div></AppLayout>;

  const getProfile = (userId: string) => profiles.find(p => p.id === userId);
  const lockedSubs = submissions.filter(s => s.locked);

  const countVotes = (field: keyof Submission, value: any) => lockedSubs.filter(s => s[field] === value).length;

  const avgPoints = lockedSubs.length > 0 ? {
    golfEase: lockedSubs.reduce((s, sub) => s + sub.points_golf_ease, 0) / lockedSubs.length,
    beachLife: lockedSubs.reduce((s, sub) => s + sub.points_beach_life, 0) / lockedSubs.length,
    exploring: lockedSubs.reduce((s, sub) => s + sub.points_exploring, 0) / lockedSubs.length,
    luxury: lockedSubs.reduce((s, sub) => s + sub.points_luxury, 0) / lockedSubs.length,
    budget: lockedSubs.reduce((s, sub) => s + sub.points_budget, 0) / lockedSubs.length,
    lowHassle: lockedSubs.reduce((s, sub) => s + sub.points_low_hassle, 0) / lockedSubs.length,
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
    // Mark non-eligible as eliminated
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
      <div className="space-y-6">
        <h2 className="font-display text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> Admin Dashboard</h2>

        {/* Completion */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Completion</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {profiles.filter(p => p.username !== "Admin").map(p => {
              const sub = submissions.find(s => s.user_id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.display_name}</span>
                  <div className="flex items-center gap-2">
                    {sub?.locked ? (
                      <>
                        <Badge className="bg-success text-success-foreground text-[10px]">✓ Ingevuld</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnlockSubmission(sub.id)}>
                          <Unlock className="h-3 w-3" />
                        </Button>
                      </>
                    ) : sub ? (
                      <Badge variant="outline" className="text-[10px]">In progress</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Niet gestart</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Majority view */}
        {lockedSubs.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Stemverdeling</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <VoteRow label="Rondes" items={[{ label: "2 rondes", count: countVotes("preferred_rounds", 2) }, { label: "3 rondes", count: countVotes("preferred_rounds", 3) }]} total={lockedSubs.length} />
              <VoteRow label="Mobiliteit" items={[{ label: "🚗 Auto", count: countVotes("mobility_choice", "car") }, { label: "🚕 Taxi", count: countVotes("mobility_choice", "transfers") }, { label: "🤷 Neutraal", count: countVotes("mobility_choice", "neutral") }]} total={lockedSubs.length} />
              <VoteRow label="Base" items={[{ label: "⛳ Golf", count: countVotes("base_choice", "golf") }, { label: "🏖️ Strand", count: countVotes("base_choice", "beach") }, { label: "🤷 Neutraal", count: countVotes("base_choice", "neutral") }]} total={lockedSubs.length} />
              <VoteRow label="Vaste bedden" items={[{ label: "Vereist", count: countVotes("require_fixed_beds", true) }, { label: "Niet", count: countVotes("require_fixed_beds", false) }]} total={lockedSubs.length} />
              <VoteRow label="3 slaapkamers" items={[{ label: "Vereist", count: countVotes("require_bedrooms_3", true) }, { label: "Niet", count: countVotes("require_bedrooms_3", false) }]} total={lockedSubs.length} />
              <VoteRow label="Annuleerbaar" items={[{ label: "Vereist", count: countVotes("require_cancelable", true) }, { label: "Niet", count: countVotes("require_cancelable", false) }]} total={lockedSubs.length} />
            </CardContent>
          </Card>
        )}

        {/* Average points */}
        {avgPoints && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Gemiddelde punten</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries({ "⛳ Golf": avgPoints.golfEase, "🏖️ Strand": avgPoints.beachLife, "🗺️ Omgeving": avgPoints.exploring, "🛋️ Luxe": avgPoints.luxury, "💰 Budget": avgPoints.budget, "😌 Gedoe": avgPoints.lowHassle }).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span>{k}</span><span className="font-semibold">{v.toFixed(1)}</span></div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Afvalrace controls */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Afvalrace controls</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={handleRunRound1} variant="destructive" className="w-full">🔨 Ronde 1: Sloperhamer</Button>
            <Button onClick={handleRunRound2} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">📊 Ronde 2: Scorebord</Button>
            <p className="text-xs text-muted-foreground">Ronde 3: Selecteer finalisten in de tabel hieronder</p>
          </CardContent>
        </Card>

        {/* Accommodations table */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Accommodaties</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ranked.map(acc => (
              <div key={acc.id} className={`border rounded-lg p-3 space-y-2 ${acc.status === "eliminated" ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">{acc.location_label} · {acc.bedrooms}k · {acc.fixed_beds_count}b · {acc.golf_minutes ?? "?"}m golf · score: {acc.totalScore.toFixed(0)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {acc.eligibility.eligible ? <Badge className="bg-success text-success-foreground text-[10px]">✓</Badge> : <Badge variant="destructive" className="text-[10px]">✗</Badge>}
                    {acc.status === "finalist" && <Badge className="bg-secondary text-secondary-foreground text-[10px]">🏆</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {acc.status === "active" && (
                    <>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleEliminate(acc.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Elimineer
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleFinalist(acc.id)}>
                        🏆 Finalist
                      </Button>
                    </>
                  )}
                  {acc.status === "eliminated" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUndo(acc.id)}>
                      <Undo2 className="h-3 w-3 mr-1" /> Undo
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleTogglePrice(acc.id, acc.transparent_price_confirmed)}>
                    {acc.transparent_price_confirmed ? "💰 Bevestigd" : "💰 Bevestig prijs"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Override log */}
        {overrides.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Override log</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {overrides.slice(0, 20).map(o => (
                <div key={o.id} className="text-xs border-b pb-2">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px]">Admin override</Badge>
                    <span className="text-muted-foreground">{new Date(o.created_at).toLocaleString("nl-NL")}</span>
                  </div>
                  <p><strong>{o.field}</strong>: {o.old_value} → {o.new_value}</p>
                  {o.reason && <p className="text-muted-foreground">{o.reason}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function VoteRow({ label, items, total }: { label: string; items: { label: string; count: number }[]; total: number }) {
  return (
    <div>
      <p className="font-medium text-xs mb-1">{label}</p>
      <div className="flex gap-2">
        {items.map(item => (
          <div key={item.label} className={`flex-1 text-center rounded-md py-1 text-xs ${item.count >= Math.ceil(total / 2) ? "bg-primary/10 text-primary font-semibold border border-primary/20" : "bg-muted"}`}>
            {item.label} <span className="font-bold">{item.count}</span>/{total}
          </div>
        ))}
      </div>
    </div>
  );
}
