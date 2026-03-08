import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { computeGroupRules, computeAvgPoints, rankAccommodations, type Accommodation, type Submission, type GroupRules } from "@/lib/scoring";
import { CheckCircle2, XCircle, Unlock, Trash2, Undo2, Shield, Trophy, Clock, ChevronDown, Eye, Users, BarChart3, Settings, FileText, Pencil, Plus } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdminEditSubmission } from "@/components/AdminEditSubmission";
import { AdminAccommodationForm } from "@/components/AdminAccommodationForm";

interface Profile { id: string; username: string; display_name: string; }
interface Override { id: string; field: string; old_value: string | null; new_value: string | null; reason: string | null; created_at: string; }
interface ActivityEvent { id: string; user_id: string; event_type: string; page: string; detail: string | null; created_at: string; }

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deadlineValue, setDeadlineValue] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showAccForm, setShowAccForm] = useState(false);
  const [editingAccId, setEditingAccId] = useState<string | null>(null);

  const fetchAll = async () => {
    const [p, s, a, o, dl, al] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("submissions").select("*"),
      supabase.from("accommodations").select("*"),
      supabase.from("admin_overrides").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("*").eq("key", "intake_deadline").single(),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(2000),
    ]);
    setProfiles((p.data as any[]) || []);
    setSubmissions((s.data as any[]) || []);
    setAccommodations((a.data as any[]) || []);
    setOverrides((o.data as any[]) || []);
    setActivityLogs((al.data as any[]) || []);
    if (dl.data) { setDeadlineValue(dl.data.value); setDeadlineInput(dl.data.value); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const lockedSubs = useMemo(() => submissions.filter(s => s.locked), [submissions]);
  const rules = useMemo(() => computeGroupRules(lockedSubs), [lockedSubs]);
  const ranked = useMemo(() => rankAccommodations(accommodations, lockedSubs, rules), [accommodations, lockedSubs, rules]);
  const avgPoints = useMemo(() => lockedSubs.length > 0 ? computeAvgPoints(lockedSubs) : null, [lockedSubs]);

  if (!isAdmin) return <AppLayout><p className="py-12 text-center text-destructive font-semibold">Geen toegang</p></AppLayout>;
  if (loading) return <AppLayout><div className="flex justify-center py-12 text-sm text-muted-foreground">Laden...</div></AppLayout>;

  const countVotes = (field: keyof Submission, value: any) => lockedSubs.filter(s => s[field] === value).length;
  const nonAdminProfiles = profiles.filter(p => p.username !== "admin" && p.username !== "Admin");
  const getAccName = (accId: string) => accommodations.find(a => a.id === accId)?.name || accId.slice(0, 8);
  const getLogsForUser = (userId: string) => activityLogs.filter(l => l.user_id === userId);
  const getSubForUser = (userId: string) => submissions.find(s => s.user_id === userId);
  const getProfileName = (userId: string) => profiles.find(p => p.id === userId)?.display_name || "Onbekend";

  const logOverride = async (field: string, oldValue: string | null, newValue: string | null, reason: string) => {
    if (!user) return;
    await supabase.from("admin_overrides").insert({ admin_user_id: user.id, field, old_value: oldValue, new_value: newValue, reason });
  };

  const handleEliminate = async (accId: string) => {
    const reason = prompt("Reden voor eliminatie:");
    if (!reason) return;
    await supabase.from("accommodations").update({ status: "eliminated", eliminated_reason: reason }).eq("id", accId);
    await logOverride("status", "active", "eliminated", reason);
    fetchAll(); toast.success("Geëlimineerd");
  };

  const handleUndo = async (accId: string) => {
    await supabase.from("accommodations").update({ status: "active", eliminated_reason: null }).eq("id", accId);
    await logOverride("status", "eliminated", "active", "Undo eliminatie");
    fetchAll(); toast.success("Hersteld");
  };

  const handleFinalist = async (accId: string) => {
    await supabase.from("accommodations").update({ status: "finalist" }).eq("id", accId);
    await logOverride("status", "active", "finalist", "Finalist geselecteerd");
    fetchAll(); toast.success("Finalist!");
  };

  const handleTogglePrice = async (accId: string, current: boolean) => {
    await supabase.from("accommodations").update({ transparent_price_confirmed: !current }).eq("id", accId);
    await logOverride("transparent_price_confirmed", String(current), String(!current), "Toggle prijs bevestiging");
    fetchAll();
  };

  const handleUnlockSubmission = async (subId: string) => {
    await supabase.from("submissions").update({ locked: false }).eq("id", subId);
    await logOverride("submission_locked", "true", "false", "Admin unlock");
    fetchAll(); toast.success("Submission unlocked");
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
    fetchAll(); toast.success(`Ronde 1: ${count} accommodaties geëlimineerd`);
  };

  const handleRunRound2 = async () => {
    await logOverride("round_2_scorebord", "", "Ranking berekend", "Ronde 2 uitgevoerd");
    toast.success("Ronde 2: Ranking is zichtbaar in de lijst");
  };

  const updateDeadline = async (newValue: string) => {
    const { error } = await supabase.from("app_settings").update({ value: newValue, updated_at: new Date().toISOString() }).eq("key", "intake_deadline");
    if (error) { toast.error("Fout bij opslaan deadline"); return; }
    await logOverride("intake_deadline", deadlineValue, newValue, "Deadline aangepast");
    setDeadlineValue(newValue); setDeadlineInput(newValue);
    fetchAll(); toast.success("Deadline bijgewerkt");
  };

  const addTime = (hours: number) => {
    const current = new Date(deadlineValue);
    current.setTime(current.getTime() + hours * 3600000);
    updateDeadline(current.toISOString());
  };

  const countBool = (field: keyof Submission) => ({ yes: countVotes(field, true), no: countVotes(field, false) });
  const budgets = lockedSubs.map(s => s.budget_cap_total).filter((b): b is number => b !== null && b > 0);
  const budgetMedian = budgets.length > 0 ? budgets.sort((a, b) => a - b)[Math.floor(budgets.length / 2)] : null;
  const budgetAvg = budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : null;

  const allDietPrefs = lockedSubs.flatMap(s => s.diet_preferences || []);
  const dietCounts: Record<string, number> = {};
  allDietPrefs.forEach(d => { dietCounts[d] = (dietCounts[d] || 0) + 1; });

  const allActivities = lockedSubs.flatMap(s => s.activities || []);
  const activityCounts: Record<string, number> = {};
  allActivities.forEach(a => { activityCounts[a] = (activityCounts[a] || 0) + 1; });

  const allRemarks = lockedSubs
    .filter(s => s.remarks_a || s.remarks_b)
    .map(s => ({ user: getProfileName(s.user_id), text: [s.remarks_a, s.remarks_b].filter(Boolean).join(" | ") }));

  const golfMinVotes: Record<number, number> = {};
  lockedSubs.forEach(s => { golfMinVotes[s.max_golf_minutes] = (golfMinVotes[s.max_golf_minutes] || 0) + 1; });

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <section className="bg-foreground text-white px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">Beheer</p>
          <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Admin Dashboard
          </h1>
        </section>

        <div className="px-6 py-6 pb-24">
          <Accordion type="multiple" defaultValue={[]} className="space-y-3">
            
            {/* 1. Deadline beheer */}
            <AccordionItem value="deadline" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Deadline beheer</span>
                  {new Date(deadlineValue) < new Date() && <Badge variant="destructive" className="text-[9px] ml-2">Verlopen</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Huidige deadline:</p>
                    <p className="font-display font-extrabold text-lg">
                      {new Date(deadlineValue).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => addTime(1)}>+1 uur</Button>
                    <Button size="sm" variant="outline" onClick={() => addTime(6)}>+6 uur</Button>
                    <Button size="sm" variant="outline" onClick={() => addTime(24)}>+1 dag</Button>
                  </div>
                  <div className="flex gap-2">
                    <Input type="datetime-local" value={deadlineInput ? new Date(deadlineInput).toISOString().slice(0, 16) : ""} onChange={e => setDeadlineInput(new Date(e.target.value).toISOString())} className="flex-1 h-9" />
                    <Button size="sm" onClick={() => updateDeadline(deadlineInput)}>Opslaan</Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Gebruikers & Intake */}
            <AccordionItem value="users" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Gebruikers & Intake</span>
                  <Badge variant="outline" className="text-[10px] font-mono ml-auto">{lockedSubs.length}/{profiles.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {nonAdminProfiles.map(p => {
                    const sub = getSubForUser(p.id);
                    const logs = getLogsForUser(p.id);
                    const lastActivity = logs[0]?.created_at;
                    const pageViews = logs.filter(l => l.event_type === "page_view").length;
                    const logins = logs.filter(l => l.event_type === "login").length;
                    const accViews = logs.filter(l => l.event_type === "accommodation_view" || (l.event_type === "click" && l.detail));
                    const intakeStarted = logs.some(l => l.event_type === "intake_started");
                    const intakeSubmitted = logs.some(l => l.event_type === "intake_submitted");
                    const sectionsViewed = [...new Set(logs.filter(l => l.event_type === "intake_section_view").map(l => l.detail))];
                    const sessionDurations = logs.filter(l => l.event_type === "session_duration");
                    const totalSessionTime = sessionDurations.reduce((acc, l) => acc + parseInt(l.detail || "0"), 0);
                    const isOnline = logs[0] ? (Date.now() - new Date(logs[0].created_at).getTime() < 5 * 60 * 1000) : false;
                    const firstActivity = logs.length > 0 ? logs[logs.length - 1]?.created_at : null;
                    const pageBreakdown: Record<string, number> = {};
                    logs.filter(l => l.event_type === "page_view").forEach(l => { pageBreakdown[l.page] = (pageBreakdown[l.page] || 0) + 1; });

                    return (
                      <Collapsible key={p.id}>
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                              <span className="text-sm font-semibold">{p.display_name}</span>
                              {sub?.locked ? (
                                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Locked</Badge>
                              ) : sub ? (
                                <Badge variant="outline" className="text-[10px]">Bezig</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">Niet gestart</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {lastActivity && <span>{new Date(lastActivity).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border border-t-0 rounded-b-lg p-4 space-y-5 bg-secondary/30">
                            <div className="flex gap-2">
                              {sub?.locked && (
                                <Button size="sm" variant="outline" onClick={() => handleUnlockSubmission(sub.id)}>
                                  <Unlock className="h-3.5 w-3.5 mr-1" /> Unlock
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setEditingUserId(editingUserId === p.id ? null : p.id)}>
                                <Pencil className="h-3.5 w-3.5 mr-1" /> {sub ? "Bewerk intake" : "Intake aanmaken"}
                              </Button>
                            </div>
                            {editingUserId === p.id && (
                              <AdminEditSubmission
                                submission={sub}
                                userId={p.id}
                                displayName={p.display_name}
                                onSaved={() => { setEditingUserId(null); fetchAll(); }}
                                onCancel={() => setEditingUserId(null)}
                              />
                            )}
                            {editingUserId !== p.id && sub ? (
                              <div className="space-y-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Intake antwoorden</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                  <LabelValue label="Vervoer" value={mobilityLabel(sub.mobility_choice)} />
                                  <LabelValue label="Locatie" value={baseLabel(sub.base_choice)} />
                                  <LabelValue label="Max golf reistijd" value={`${sub.max_golf_minutes} min`} />
                                  <LabelValue label="Rondes" value={`${sub.preferred_rounds}`} />
                                  <LabelValue label="Budget cap" value={sub.budget_cap_total ? `€${sub.budget_cap_total}` : "—"} />
                                  <LabelValue label="Akkoord feiten" value={sub.agreed_facts ? "Ja" : "Nee"} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Must-haves</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    <WishBadge label="Vaste bedden" active={sub.require_fixed_beds} />
                                    <WishBadge label="3 slaapkamers" active={sub.require_bedrooms_3} />
                                    <WishBadge label="Zwembad" active={sub.require_pool} />
                                    <WishBadge label="Airco" active={sub.require_airco} />
                                    <WishBadge label="Wifi" active={sub.require_wifi} />
                                    <WishBadge label="Parking" active={sub.require_parking} />
                                    <WishBadge label="Terras" active={sub.require_terrace} />
                                    <WishBadge label="Transparante prijs" active={sub.require_transparent_price} />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Puntenverdeling</p>
                                  <div className="space-y-1.5">
                                    <MiniBar label="Golf" value={sub.points_golf_ease} avg={avgPoints?.golfEase} />
                                    <MiniBar label="Strand" value={sub.points_beach_life} avg={avgPoints?.beachLife} />
                                    <MiniBar label="Omgeving" value={sub.points_exploring} avg={avgPoints?.exploring} />
                                    <MiniBar label="Luxe" value={sub.points_luxury} avg={avgPoints?.luxury} />
                                    <MiniBar label="Budget" value={sub.points_budget} avg={avgPoints?.budget} />
                                    <MiniBar label="Gedoe" value={sub.points_low_hassle} avg={avgPoints?.lowHassle} />
                                  </div>
                                </div>
                                {(sub.diet_preferences?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Eetvoorkeuren</p>
                                    <div className="flex flex-wrap gap-1">{sub.diet_preferences!.map(d => <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>)}</div>
                                    {sub.diet_remarks && <p className="text-xs text-muted-foreground mt-1 italic">{sub.diet_remarks}</p>}
                                  </div>
                                )}
                                {(sub.activities?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Activiteiten</p>
                                    <div className="flex flex-wrap gap-1">{sub.activities!.map(a => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}</div>
                                  </div>
                                )}
                                {(sub.remarks_a || sub.remarks_b) && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Opmerkingen</p>
                                    <p className="text-xs text-muted-foreground italic">{[sub.remarks_a, sub.remarks_b].filter(Boolean).join(" | ")}</p>
                                  </div>
                                )}
                              </div>
                            ) : !sub ? (
                              <p className="text-xs text-muted-foreground italic">Nog geen intake ingevuld</p>
                            ) : null}
                            <div className="space-y-3 border-t pt-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gedrag</p>
                              <div className="grid grid-cols-4 gap-2">
                                <StatBlock value={logins} label="Logins" />
                                <StatBlock value={pageViews} label="Pageviews" />
                                <StatBlock value={accViews.length} label="Acc. bekeken" />
                                <StatBlock value={totalSessionTime > 0 ? `${Math.round(totalSessionTime / 60)}m` : "—"} label="Sessietijd" />
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-secondary rounded-lg p-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Eerste activiteit</p>
                                  <p className="font-medium">{firstActivity ? new Date(firstActivity).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Laatste activiteit</p>
                                  <p className="font-medium">{lastActivity ? new Date(lastActivity).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                                </div>
                              </div>
                              <div className="bg-secondary rounded-lg p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Intake voortgang</p>
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge variant={intakeStarted ? "default" : "outline"} className={`text-[10px] ${!intakeStarted ? "opacity-40" : ""}`}>{intakeStarted ? "✓" : "✗"} Gestart</Badge>
                                  {sectionsViewed.map(s => <Badge key={s} variant="secondary" className="text-[10px]">Sectie {s}</Badge>)}
                                  <Badge variant={intakeSubmitted ? "default" : "outline"} className={`text-[10px] ${!intakeSubmitted ? "opacity-40" : ""}`}>{intakeSubmitted ? "✓" : "✗"} Ingediend</Badge>
                                </div>
                              </div>
                              {Object.keys(pageBreakdown).length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Pagina breakdown</p>
                                  <div className="space-y-1">
                                    {Object.entries(pageBreakdown).sort(([, a], [, b]) => b - a).map(([page, count]) => (
                                      <div key={page} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                                        <span className="text-muted-foreground">{page}</span>
                                        <span className="font-bold">{count}×</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {accViews.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Bekeken accommodaties</p>
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(accViews.reduce<Record<string, number>>((acc, l) => { const key = l.detail || "?"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([accId, count]) => (
                                      <Badge key={accId} variant="secondary" className="text-[10px]">{getAccName(accId)} <span className="font-bold ml-1">{count}×</span></Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {logs.length > 0 && <EventTimeline logs={logs} getAccName={getAccName} />}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Groepsresultaten */}
            {lockedSubs.length > 0 && (
              <AccordionItem value="results" className="border rounded-lg border-border/60 overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="font-display font-bold text-sm">Groepsresultaten</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-3">
                      <p className="text-xs font-semibold text-foreground">Berekende groepsregels (meerderheid)</p>
                      <div className="flex flex-wrap gap-1.5">
                        <RuleBadge label="Vaste bedden" active={rules.requireFixedBeds} />
                        <RuleBadge label="3 slaapkamers" active={rules.requireBedrooms3} />
                        <RuleBadge label="Annuleerbaar" active={rules.requireCancelable} />
                        <RuleBadge label="Transparante prijs" active={rules.requireTransparentPrice} />
                        <RuleBadge label="Zwembad" active={rules.requirePool} />
                        <RuleBadge label="Airco" active={rules.requireAirco} />
                        <RuleBadge label="Wifi" active={rules.requireWifi} />
                        <RuleBadge label="Parking" active={rules.requireParking} />
                        <RuleBadge label="Terras" active={rules.requireTerrace} />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Max golf reistijd: <strong>{rules.maxGolfMinutes} min</strong></p>
                        <p>Budget cap: <strong>{rules.budgetCap ? `€${rules.budgetCap}` : "Geen"}</strong></p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-foreground">Stemverdeling</p>
                      <VoteRow label="Rondes" items={[{ label: "2 rondes", count: countVotes("preferred_rounds", 2) }, { label: "3 rondes", count: countVotes("preferred_rounds", 3) }]} total={lockedSubs.length} />
                      <VoteRow label="Vervoer" items={[{ label: "Auto", count: countVotes("mobility_choice", "car") }, { label: "Taxi", count: countVotes("mobility_choice", "transfers") }, { label: "Neutraal", count: countVotes("mobility_choice", "neutral") }]} total={lockedSubs.length} />
                      <VoteRow label="Locatie" items={[{ label: "Golf", count: countVotes("base_choice", "golf") }, { label: "Strand", count: countVotes("base_choice", "beach") }, { label: "Neutraal", count: countVotes("base_choice", "neutral") }]} total={lockedSubs.length} />
                      {([
                        ["Vaste bedden", "require_fixed_beds"], ["3 slaapkamers", "require_bedrooms_3"],
                        ["Zwembad", "require_pool"], ["Airco", "require_airco"], ["Wifi", "require_wifi"],
                        ["Parking", "require_parking"], ["Terras", "require_terrace"], ["Transparante prijs", "require_transparent_price"],
                      ] as [string, keyof Submission][]).map(([label, field]) => {
                        const b = countBool(field);
                        return <VoteRow key={field} label={label} items={[{ label: "Vereist", count: b.yes }, { label: "Niet", count: b.no }]} total={lockedSubs.length} />;
                      })}
                      {Object.keys(golfMinVotes).length > 0 && (
                        <VoteRow label="Max golf reistijd" items={Object.entries(golfMinVotes).sort(([a], [b]) => Number(a) - Number(b)).map(([min, count]) => ({ label: `${min} min`, count }))} total={lockedSubs.length} />
                      )}
                    </div>
                    {avgPoints && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Gemiddelde punten</p>
                        <div className="border rounded-lg p-4 space-y-2">
                          {([["Golf", avgPoints.golfEase], ["Strand", avgPoints.beachLife], ["Omgeving", avgPoints.exploring], ["Luxe", avgPoints.luxury], ["Budget", avgPoints.budget], ["Gedoe", avgPoints.lowHassle]] as [string, number][]).map(([k, v]) => (
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
                    )}
                    {budgets.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Budget overzicht</p>
                        <div className="border rounded-lg p-4 grid grid-cols-3 gap-3">
                          <StatBlock value={`€${Math.min(...budgets)}`} label="Laagste" />
                          <StatBlock value={`€${budgetMedian}`} label="Mediaan" />
                          <StatBlock value={`€${Math.round(budgetAvg!)}`} label="Gemiddeld" />
                        </div>
                      </div>
                    )}
                    {Object.keys(dietCounts).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Eetvoorkeuren</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(dietCounts).sort(([, a], [, b]) => b - a).map(([diet, count]) => (
                            <Badge key={diet} variant="secondary" className="text-[10px]">{diet} <span className="font-bold ml-1">{count}×</span></Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {Object.keys(activityCounts).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Activiteiten naast golf</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(activityCounts).sort(([, a], [, b]) => b - a).map(([act, count]) => (
                            <Badge key={act} variant="outline" className="text-[10px]">{act} <span className="font-bold ml-1">{count}×</span></Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {allRemarks.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Opmerkingen</p>
                        <div className="border rounded-lg divide-y">
                          {allRemarks.map((r, i) => (
                            <div key={i} className="p-3 text-xs">
                              <span className="font-semibold">{r.user}:</span> <span className="text-muted-foreground italic">{r.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* 4. Selectieronde */}
            <AccordionItem value="selection" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Selectieronde</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  <Button onClick={handleRunRound1} variant="destructive" className="w-full font-semibold">Ronde 1: Sloperhamer</Button>
                  <Button onClick={handleRunRound2} className="w-full font-semibold">Ronde 2: Scorebord</Button>
                  <p className="text-xs text-muted-foreground text-center">Ronde 3: Selecteer finalisten hieronder</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 5. Accommodaties */}
            <AccordionItem value="accommodations" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Accommodaties</span>
                  <Badge variant="outline" className="text-[10px] font-mono ml-auto">{ranked.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  <Button size="sm" variant="outline" className="w-full" onClick={() => { setShowAccForm(true); setEditingAccId(null); }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Accommodatie toevoegen
                  </Button>
                  {(showAccForm || editingAccId) && (
                    <AdminAccommodationForm
                      editId={editingAccId}
                      onSaved={() => { setShowAccForm(false); setEditingAccId(null); fetchAll(); }}
                      onCancel={() => { setShowAccForm(false); setEditingAccId(null); }}
                    />
                  )}
                  {ranked.map(acc => (
                    <div key={acc.id} className={`border rounded-lg p-3 space-y-2 transition-opacity ${acc.status === "eliminated" ? "opacity-40" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{acc.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {acc.location_label} · {acc.bedrooms}k · {acc.fixed_beds_count}b · {acc.golf_minutes ?? "?"}m golf
                            {acc.total_price_3_nights && ` · €${acc.total_price_3_nights}`}
                          </p>
                          {acc.tags.length > 0 && <div className="flex flex-wrap gap-0.5 mt-1">{acc.tags.map(t => <Badge key={t} variant="outline" className="text-[9px] px-1 py-0">{t}</Badge>)}</div>}
                          {!acc.eligibility.eligible && <p className="text-[10px] text-destructive mt-1">{acc.eligibility.failures.join(", ")}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-display font-extrabold text-sm text-primary">{acc.totalScore.toFixed(0)}</span>
                          {acc.eligibility.eligible ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                          {acc.status === "finalist" && <Trophy className="h-4 w-4 text-warning" />}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {acc.status === "active" && (
                          <>
                            <Button size="sm" variant="destructive" className="h-7 text-[11px] px-2" onClick={() => handleEliminate(acc.id)}><Trash2 className="h-3 w-3 mr-1" /> Elimineer</Button>
                            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => handleFinalist(acc.id)}><Trophy className="h-3 w-3 mr-1" /> Finalist</Button>
                          </>
                        )}
                        {acc.status === "eliminated" && <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => handleUndo(acc.id)}><Undo2 className="h-3 w-3 mr-1" /> Undo</Button>}
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => handleTogglePrice(acc.id, acc.transparent_price_confirmed)}>
                          {acc.transparent_price_confirmed ? "✓ Prijs" : "Bevestig prijs"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 6. Override log */}
            {overrides.length > 0 && (
              <AccordionItem value="overrides" className="border rounded-lg border-border/60 overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="font-display font-bold text-sm">Override log</span>
                    <Badge variant="outline" className="text-[10px] font-mono ml-auto">{overrides.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="border rounded-lg divide-y">
                    {overrides.slice(0, 20).map(o => (
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
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </div>
    </AppLayout>
  );
}

// --- Helper components ---
function VoteRow({ label, items, total }: { label: string; items: { label: string; count: number }[]; total: number }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-1.5">{label}</p>
      <div className="flex gap-1.5">
        {items.map(item => {
          const isMajority = item.count >= Math.ceil(total / 2);
          return (
            <div key={item.label} className={`flex-1 text-center rounded-md py-1.5 text-xs font-medium transition-colors ${isMajority ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-muted-foreground"}`}>
              {item.label} <span className="font-bold">{item.count}</span>/{total}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function WishBadge({ label, active }: { label: string; active: boolean }) {
  return <Badge variant={active ? "default" : "outline"} className={`text-[10px] ${active ? "" : "opacity-40"}`}>{active ? "✓" : "✗"} {label}</Badge>;
}

function RuleBadge({ label, active }: { label: string; active: boolean }) {
  return <Badge variant={active ? "default" : "outline"} className={`text-[10px] ${active ? "bg-primary text-primary-foreground" : "opacity-50"}`}>{active ? "✓" : "—"} {label}</Badge>;
}

function MiniBar({ label, value, avg }: { label: string; value: number; avg?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden relative">
        <div className="bg-primary h-full rounded-full" style={{ width: `${value}%` }} />
        {avg !== undefined && <div className="absolute top-0 h-full w-0.5 bg-destructive/60" style={{ left: `${avg}%` }} title={`Gem: ${avg.toFixed(0)}`} />}
      </div>
      <span className="text-[10px] font-bold tabular-nums w-6 text-right">{value}</span>
    </div>
  );
}

function StatBlock({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display font-extrabold text-lg">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

function mobilityLabel(v: string) { return v === "car" ? "Huurauto" : v === "transfers" ? "Taxi/transfers" : "Neutraal"; }
function baseLabel(v: string) { return v === "golf" ? "Dicht bij golf" : v === "beach" ? "Dicht bij strand" : "Neutraal"; }

function EventTimeline({ logs, getAccName }: { logs: { id: string; user_id: string; event_type: string; page: string; detail: string | null; created_at: string }[]; getAccName: (id: string) => string }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? logs : logs.slice(0, 30);

  const eventColor = (type: string) => {
    if (type === "login") return "default" as const;
    if (type === "intake_submitted") return "default" as const;
    if (type === "accommodation_view") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Volledige tijdlijn ({logs.length} events)</p>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {displayed.map(l => (
          <div key={l.id} className="flex items-center justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Badge variant={eventColor(l.event_type)} className="text-[9px] px-1 py-0 shrink-0">{l.event_type}</Badge>
              <span className="text-muted-foreground truncate">{l.page}</span>
              {l.detail && <span className="text-muted-foreground truncate max-w-[120px]">({l.event_type === "accommodation_view" || l.event_type === "click" ? getAccName(l.detail) : l.detail})</span>}
            </div>
            <span className="text-muted-foreground text-[10px] shrink-0 ml-2">{new Date(l.created_at).toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
          </div>
        ))}
      </div>
      {logs.length > 30 && !showAll && (
        <button onClick={() => setShowAll(true)} className="text-xs text-primary font-semibold mt-2 hover:underline">Toon alle {logs.length} events</button>
      )}
    </div>
  );
}
