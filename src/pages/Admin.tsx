import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { computeGroupRules, rankAccommodations, type Accommodation, type Submission } from "@/lib/scoring";
import { CheckCircle2, XCircle, Unlock, Trash2, Undo2, Shield, Trophy, Clock, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface ActivityEvent {
  id: string;
  user_id: string;
  event_type: string;
  page: string;
  detail: string | null;
  created_at: string;
}

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Deadline state
  const [deadlineValue, setDeadlineValue] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");

  const fetchAll = async () => {
    const [p, s, a, o, dl, al] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("submissions").select("*"),
      supabase.from("accommodations").select("*"),
      supabase.from("admin_overrides").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("*").eq("key", "intake_deadline").single(),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setProfiles((p.data as any[]) || []);
    setSubmissions((s.data as any[]) || []);
    setAccommodations((a.data as any[]) || []);
    setOverrides((o.data as any[]) || []);
    setActivityLogs((al.data as any[]) || []);
    if (dl.data) {
      setDeadlineValue(dl.data.value);
      setDeadlineInput(dl.data.value);
    }
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

  // Deadline handlers
  const updateDeadline = async (newValue: string) => {
    const { error } = await supabase.from("app_settings").update({ value: newValue, updated_at: new Date().toISOString() }).eq("key", "intake_deadline");
    if (error) { toast.error("Fout bij opslaan deadline"); return; }
    await logOverride("intake_deadline", deadlineValue, newValue, "Deadline aangepast");
    setDeadlineValue(newValue);
    setDeadlineInput(newValue);
    fetchAll();
    toast.success("Deadline bijgewerkt");
  };

  const addTime = (hours: number) => {
    const current = new Date(deadlineValue);
    current.setTime(current.getTime() + hours * 3600000);
    updateDeadline(current.toISOString());
  };

  // User activity helpers
  const nonAdminProfiles = profiles.filter(p => p.username !== "admin");
  const getLogsForUser = (userId: string) => activityLogs.filter(l => l.user_id === userId);
  const getAccName = (accId: string) => accommodations.find(a => a.id === accId)?.name || accId;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Admin</p>
          <h2 className="font-display text-xl font-extrabold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Dashboard
          </h2>
        </div>

        {/* Deadline beheer */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Deadline beheer
          </p>
          <div className="border rounded-lg p-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Huidige deadline:</p>
              <p className="font-display font-extrabold text-lg">
                {new Date(deadlineValue).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}
              </p>
              {new Date(deadlineValue) < new Date() && (
                <Badge variant="destructive" className="mt-1 text-xs">Verlopen</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addTime(1)}>+1 uur</Button>
              <Button size="sm" variant="outline" onClick={() => addTime(6)}>+6 uur</Button>
              <Button size="sm" variant="outline" onClick={() => addTime(24)}>+1 dag</Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="datetime-local"
                value={deadlineInput ? new Date(deadlineInput).toISOString().slice(0, 16) : ""}
                onChange={e => setDeadlineInput(new Date(e.target.value).toISOString())}
                className="flex-1 h-9"
              />
              <Button size="sm" onClick={() => updateDeadline(deadlineInput)}>Opslaan</Button>
            </div>
          </div>
        </section>

        {/* Completion */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completion</p>
          <div className="border rounded-lg divide-y">
            {profiles.filter(p => p.username !== "Admin" && p.username !== "admin").map(p => {
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

        {/* Gebruikersactiviteit */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Gebruikersactiviteit
          </p>
          <div className="space-y-2">
            {nonAdminProfiles.map(p => {
              const logs = getLogsForUser(p.id);
              const lastActivity = logs[0]?.created_at;
              const pageViews = logs.filter(l => l.event_type === "page_view").length;
              const logins = logs.filter(l => l.event_type === "login").length;
              const uniquePages = [...new Set(logs.filter(l => l.event_type === "page_view").map(l => l.page))];
              const accViews = logs.filter(l => l.event_type === "click" && l.page === "/accommodations" && l.detail);

              return (
                <Collapsible key={p.id}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{p.display_name}</span>
                        {logs.length === 0 && <Badge variant="outline" className="text-[10px]">Geen activiteit</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {lastActivity && (
                          <span>{new Date(lastActivity).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border border-t-0 rounded-b-lg p-4 space-y-4 bg-secondary/30">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="font-display font-extrabold text-lg">{logins}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Logins</p>
                        </div>
                        <div className="text-center">
                          <p className="font-display font-extrabold text-lg">{pageViews}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pageviews</p>
                        </div>
                        <div className="text-center">
                          <p className="font-display font-extrabold text-lg">{accViews.length}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Acc. bekeken</p>
                        </div>
                      </div>

                      {/* Unique pages */}
                      {uniquePages.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bezochte pagina's</p>
                          <div className="flex flex-wrap gap-1">
                            {uniquePages.map(page => (
                              <Badge key={page} variant="outline" className="text-[10px]">{page}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Accommodation views */}
                      {accViews.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Accommodaties bekeken</p>
                          <div className="flex flex-wrap gap-1">
                            {[...new Set(accViews.map(l => l.detail!))].map(accId => (
                              <Badge key={accId} variant="secondary" className="text-[10px]">{getAccName(accId)}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      {logs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Laatste activiteit</p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {logs.slice(0, 20).map(l => (
                              <div key={l.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant={l.event_type === "login" ? "default" : l.event_type === "click" ? "secondary" : "outline"} className="text-[9px] px-1.5 py-0">
                                    {l.event_type}
                                  </Badge>
                                  <span className="text-muted-foreground">{l.page}</span>
                                  {l.detail && <span className="text-muted-foreground truncate max-w-[120px]">({getAccName(l.detail)})</span>}
                                </div>
                                <span className="text-muted-foreground text-[10px] shrink-0">
                                  {new Date(l.created_at).toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
