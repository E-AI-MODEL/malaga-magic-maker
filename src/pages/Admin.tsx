import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { computeGroupRules, computeAvgPoints, rankAccommodations, type Accommodation, type Submission, type GroupRules } from "@/lib/scoring";
import { useTrip } from "@/contexts/TripContext";
import { VoteOverviewTable } from "@/components/VoteOverviewTable";
import {
  CheckCircle2, XCircle, Unlock, Trash2, Undo2, Shield, Trophy, Clock, ChevronDown, Eye, Users,
  BarChart3, Settings, FileText, Pencil, Plus, MapPin, Table2, TrendingUp, AlertCircle, Bed, Timer
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdminEditSubmission } from "@/components/AdminEditSubmission";
import { AdminAccommodationForm } from "@/components/AdminAccommodationForm";
import { BulkImportAccommodations } from "@/components/BulkImportAccommodations";
import { AdminPOIManager } from "@/components/AdminPOIManager";
import { HeroSkeleton, CardSkeleton } from "@/components/PageSkeleton";

interface Profile { id: string; username: string; display_name: string; }
interface Override { id: string; field: string; old_value: string | null; new_value: string | null; reason: string | null; created_at: string; }
interface ActivityEvent { id: string; user_id: string; event_type: string; page: string; detail: string | null; created_at: string; }

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const { activeTrip } = useTrip();
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

  const tripId = activeTrip?.id;

  const fetchAll = async () => {
    if (!tripId) return;
    const [p, s, a, o, dl, al] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("submissions").select("*").eq("trip_id", tripId),
      supabase.from("accommodations").select("*").eq("trip_id", tripId),
      supabase.from("admin_overrides").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("*").eq("key", "intake_deadline").single(),
      supabase.from("activity_log").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }).limit(2000),
    ]);
    setProfiles((p.data as any[]) || []);
    setSubmissions((s.data as any[]) || []);
    setAccommodations((a.data as any[]) || []);
    setOverrides((o.data as any[]) || []);
    setActivityLogs((al.data as any[]) || []);
    if (dl.data) { setDeadlineValue(dl.data.value); setDeadlineInput(dl.data.value); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [tripId]);

  const lockedSubs = useMemo(() => submissions.filter(s => s.locked), [submissions]);
  const rules = useMemo(() => computeGroupRules(lockedSubs), [lockedSubs]);
  const ranked = useMemo(() => rankAccommodations(accommodations, lockedSubs, rules), [accommodations, lockedSubs, rules]);
  const avgPoints = useMemo(() => lockedSubs.length > 0 ? computeAvgPoints(lockedSubs) : null, [lockedSubs]);

  if (!isAdmin) return <AppLayout><p className="py-12 text-center text-destructive font-semibold">Geen toegang</p></AppLayout>;
  if (loading) return <AppLayout><div><HeroSkeleton /><div className="px-6 py-6 space-y-4"><CardSkeleton /><CardSkeleton /></div></div></AppLayout>;

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

  const [eliminateTarget, setEliminateTarget] = useState<string | null>(null);
  const [eliminateReason, setEliminateReason] = useState("");

  const handleEliminate = async (accId: string) => {
    setEliminateTarget(accId);
    setEliminateReason("");
  };

  const confirmEliminate = async () => {
    if (!eliminateTarget || !eliminateReason.trim()) return;
    await supabase.from("accommodations").update({ status: "eliminated", eliminated_reason: eliminateReason }).eq("id", eliminateTarget);
    await logOverride("status", "active", "eliminated", eliminateReason);
    setEliminateTarget(null);
    setEliminateReason("");
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
    fetchAll(); toast.success("Intake ontgrendeld");
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

  const activeAccs = ranked.filter(a => a.status === "active");
  const eliminatedAccs = ranked.filter(a => a.status === "eliminated");
  const finalistAccs = ranked.filter(a => a.status === "finalist");
  const deadlineExpired = new Date(deadlineValue) < new Date();

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <section className="bg-foreground text-white px-6 py-8">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-white/40" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Beheer</p>
          </div>
          <h1 className="font-display text-2xl font-extrabold">Admin Dashboard</h1>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <QuickStat value={lockedSubs.length} total={nonAdminProfiles.length} label="Intakes" icon={<Users className="h-3.5 w-3.5" />} />
            <QuickStat value={activeAccs.length} label="Actief" icon={<Home className="h-3.5 w-3.5" />} />
            <QuickStat value={finalistAccs.length} label="Finalisten" icon={<Trophy className="h-3.5 w-3.5" />} />
            <QuickStat value={eliminatedAccs.length} label="Afgevallen" icon={<XCircle className="h-3.5 w-3.5" />} />
          </div>
        </section>

        {/* Deadline banner */}
        {deadlineExpired && deadlineValue && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">Deadline verlopen</p>
            <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => addTime(24)}>+1 dag</Button>
          </div>
        )}

        <div className="px-6 py-6 pb-24">
          <Accordion type="multiple" defaultValue={[]} className="space-y-3">

            {/* ═══ DEADLINE ═══ */}
            <AccordionItem value="deadline" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Deadline</span>
                  <Badge variant={deadlineExpired ? "destructive" : "outline"} className="text-[10px] ml-auto">
                    {deadlineValue ? new Date(deadlineValue).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Niet ingesteld"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <div className="bg-secondary rounded-xl p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Huidige deadline</p>
                  <p className="font-display font-extrabold text-lg">
                    {deadlineValue ? new Date(deadlineValue).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" }) : "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => addTime(1)}>+1 uur</Button>
                  <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => addTime(6)}>+6 uur</Button>
                  <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => addTime(24)}>+1 dag</Button>
                </div>
                <div className="flex gap-2">
                  <Input type="datetime-local" value={deadlineInput ? new Date(deadlineInput).toISOString().slice(0, 16) : ""} onChange={e => setDeadlineInput(new Date(e.target.value).toISOString())} className="flex-1 h-9" />
                  <Button size="sm" className="h-9" onClick={() => updateDeadline(deadlineInput)}>Opslaan</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ═══ GEBRUIKERS & INTAKE ═══ */}
            <AccordionItem value="users" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Gebruikers & Intake</span>
                  <Badge variant="outline" className="text-[10px] font-mono ml-auto">{lockedSubs.length}/{nonAdminProfiles.length} ingediend</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {nonAdminProfiles.map(p => (
                    <UserCard
                      key={p.id}
                      profile={p}
                      submission={getSubForUser(p.id)}
                      logs={getLogsForUser(p.id)}
                      avgPoints={avgPoints}
                      accommodations={accommodations}
                      getAccName={getAccName}
                      editingUserId={editingUserId}
                      onToggleEdit={(id) => setEditingUserId(editingUserId === id ? null : id)}
                      onUnlock={handleUnlockSubmission}
                      onSaved={() => { setEditingUserId(null); fetchAll(); }}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ═══ STEMOVERZICHT ═══ */}
            {lockedSubs.length > 0 && (
              <AccordionItem value="stemoverzicht" className="border rounded-lg border-border/60 overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                  <div className="flex items-center gap-2 w-full">
                    <Table2 className="h-4 w-4 text-primary" />
                    <span className="font-display font-bold text-sm">Stemoverzicht</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{lockedSubs.length} intakes</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <VoteOverviewTable submissions={submissions} rules={rules} profiles={profiles} />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* ═══ GROEPSREGELS ═══ */}
            {lockedSubs.length > 0 && (
              <AccordionItem value="rules" className="border rounded-lg border-border/60 overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                  <div className="flex items-center gap-2 w-full">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="font-display font-bold text-sm">Groepsregels & Stemming</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-5">
                  {/* Computed rules */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Berekende vereisten (meerderheid)</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ["Vaste bedden", rules.requireFixedBeds], ["3 slaapkamers", rules.requireBedrooms3],
                        ["Annuleerbaar", rules.requireCancelable], ["Transp. prijs", rules.requireTransparentPrice],
                        ["Zwembad", rules.requirePool], ["Airco", rules.requireAirco],
                        ["Wifi", rules.requireWifi], ["Parking", rules.requireParking], ["Terras", rules.requireTerrace],
                      ] as [string, boolean][]).map(([label, active]) => (
                        <div key={label} className={`rounded-lg p-2.5 text-center text-xs font-medium border transition-colors ${
                          active ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary text-muted-foreground border-transparent"
                        }`}>
                          {active ? "✓" : "—"} {label}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-secondary rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max golf reistijd</p>
                        <p className="font-display font-extrabold text-lg">{rules.maxGolfMinutes} min</p>
                      </div>
                      <div className="bg-secondary rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget cap</p>
                        <p className="font-display font-extrabold text-lg">{rules.budgetCap ? `€${rules.budgetCap}` : "Geen"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vote distribution */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stemverdeling</p>
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
                  </div>

                  {/* Average points */}
                  {avgPoints && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Gemiddelde punten</p>
                      <div className="space-y-2">
                        {([["Golf", avgPoints.golfEase], ["Strand", avgPoints.beachLife], ["Omgeving", avgPoints.exploring], ["Luxe", avgPoints.luxury], ["Budget", avgPoints.budget], ["Gedoe", avgPoints.lowHassle]] as [string, number][]).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-16 shrink-0">{k}</span>
                            <div className="flex-1 bg-secondary rounded-full h-2.5 overflow-hidden">
                              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${v}%` }} />
                            </div>
                            <span className="text-xs font-display font-bold tabular-nums w-8 text-right">{v.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* ═══ SELECTIERONDE ═══ */}
            <AccordionItem value="selection" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Selectieronde</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleRunRound1} className="rounded-xl border-2 border-destructive/20 bg-destructive/5 p-4 text-center hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-5 w-5 text-destructive mx-auto mb-2" />
                    <p className="font-display font-bold text-sm">Ronde 1</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Sloperhamer — elimineer niet-geschikt</p>
                  </button>
                  <button onClick={handleRunRound2} className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 text-center hover:bg-primary/10 transition-colors">
                    <BarChart3 className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="font-display font-bold text-sm">Ronde 2</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Scorebord — ranking berekenen</p>
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Ronde 3: selecteer finalisten bij de accommodaties hieronder</p>
              </AccordionContent>
            </AccordionItem>

            {/* ═══ ACCOMMODATIES ═══ */}
            <AccordionItem value="accommodations" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Accommodaties</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    {finalistAccs.length > 0 && <Badge className="text-[10px] bg-warning/10 text-warning border-warning/20">{finalistAccs.length} finalist</Badge>}
                    <Badge variant="outline" className="text-[10px] font-mono">{activeAccs.length} actief</Badge>
                    {eliminatedAccs.length > 0 && <Badge variant="outline" className="text-[10px] font-mono opacity-50">{eliminatedAccs.length} weg</Badge>}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => { setShowAccForm(true); setEditingAccId(null); }}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Toevoegen
                  </Button>
                </div>
                <BulkImportAccommodations onImported={fetchAll} />
                {(showAccForm || editingAccId) && (
                  <AdminAccommodationForm
                    editId={editingAccId}
                    onSaved={() => { setShowAccForm(false); setEditingAccId(null); fetchAll(); }}
                    onCancel={() => { setShowAccForm(false); setEditingAccId(null); }}
                  />
                )}

                {/* Finalisten */}
                {finalistAccs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Finalisten</p>
                    <div className="space-y-2">
                      {finalistAccs.map(acc => <AccommodationRow key={acc.id} acc={acc} onEliminate={handleEliminate} onUndo={handleUndo} onFinalist={handleFinalist} onTogglePrice={handleTogglePrice} onEdit={(id) => { setEditingAccId(id); setShowAccForm(false); }} />)}
                    </div>
                  </div>
                )}

                {/* Actief */}
                {activeAccs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Actief ({activeAccs.length})</p>
                    <div className="space-y-2">
                      {activeAccs.map(acc => <AccommodationRow key={acc.id} acc={acc} onEliminate={handleEliminate} onUndo={handleUndo} onFinalist={handleFinalist} onTogglePrice={handleTogglePrice} onEdit={(id) => { setEditingAccId(id); setShowAccForm(false); }} />)}
                    </div>
                  </div>
                )}

                {/* Geëlimineerd */}
                {eliminatedAccs.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 py-2 hover:text-muted-foreground transition-colors">
                        <ChevronDown className="h-3.5 w-3.5" />
                        Geëlimineerd ({eliminatedAccs.length})
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2">
                        {eliminatedAccs.map(acc => <AccommodationRow key={acc.id} acc={acc} onEliminate={handleEliminate} onUndo={handleUndo} onFinalist={handleFinalist} onTogglePrice={handleTogglePrice} onEdit={(id) => { setEditingAccId(id); setShowAccForm(false); }} />)}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* ═══ POI BEHEER ═══ */}
            <AccordionItem value="pois" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">POI / Reistijden</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <AdminPOIManager />
              </AccordionContent>
            </AccordionItem>

            {/* ═══ OVERRIDE LOG ═══ */}
            {overrides.length > 0 && (
              <AccordionItem value="overrides" className="border rounded-lg border-border/60 overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                  <div className="flex items-center gap-2 w-full">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="font-display font-bold text-sm">Audit log</span>
                    <Badge variant="outline" className="text-[10px] font-mono ml-auto">{overrides.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-1">
                    {overrides.slice(0, 20).map(o => (
                      <div key={o.id} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                        <div className="h-2 w-2 rounded-full bg-primary/30 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold">{o.field}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{new Date(o.created_at).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          {o.old_value && <p className="text-[10px] text-muted-foreground">{o.old_value} → {o.new_value}</p>}
                          {o.reason && <p className="text-[10px] text-muted-foreground italic">{o.reason}</p>}
                        </div>
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

// ─── Sub-components ─────────────────────────────────────────────

function QuickStat({ value, total, label, icon }: { value: number; total?: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-white/40 mb-1">{icon}</div>
      <p className="font-display font-extrabold text-lg text-white">
        {value}{total !== undefined && <span className="text-white/30 text-sm">/{total}</span>}
      </p>
      <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function Home({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}

function UserCard({ profile: p, submission: sub, logs, avgPoints, accommodations, getAccName, editingUserId, onToggleEdit, onUnlock, onSaved }: {
  profile: Profile; submission: Submission | undefined; logs: ActivityEvent[];
  avgPoints: any; accommodations: Accommodation[]; getAccName: (id: string) => string;
  editingUserId: string | null; onToggleEdit: (id: string) => void;
  onUnlock: (subId: string) => void; onSaved: () => void;
}) {
  const lastActivity = logs[0]?.created_at;
  const isOnline = logs[0] ? (Date.now() - new Date(logs[0].created_at).getTime() < 5 * 60 * 1000) : false;
  const logins = logs.filter(l => l.event_type === "login").length;
  const pageViews = logs.filter(l => l.event_type === "page_view").length;

  return (
    <Collapsible>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:bg-accent/5 transition-colors">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground/20"}`} />
            <span className="text-sm font-semibold">{p.display_name}</span>
            {sub?.locked ? (
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Ingediend</Badge>
            ) : sub ? (
              <Badge variant="outline" className="text-[10px]">Bezig</Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px]">Niet gestart</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastActivity && <span className="text-[10px] text-muted-foreground">{new Date(lastActivity).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 border-border/60 rounded-b-xl p-4 space-y-4 -mt-1 bg-secondary/20">
          {/* Actions */}
          <div className="flex gap-2">
            {sub?.locked && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onUnlock(sub.id)}>
                <Unlock className="h-3 w-3 mr-1" /> Ontgrendel
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onToggleEdit(p.id)}>
              <Pencil className="h-3 w-3 mr-1" /> {sub ? "Bewerk" : "Aanmaken"}
            </Button>
          </div>

          {/* Edit form */}
          {editingUserId === p.id && (
            <AdminEditSubmission
              submission={sub}
              userId={p.id}
              displayName={p.display_name}
              onSaved={onSaved}
              onCancel={() => onToggleEdit(p.id)}
            />
          )}

          {/* Intake summary */}
          {editingUserId !== p.id && sub && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-background rounded-lg p-2.5 border border-border/40">
                  <p className="text-[10px] text-muted-foreground">Vervoer</p>
                  <p className="font-semibold">{mobilityLabel(sub.mobility_choice)}</p>
                </div>
                <div className="bg-background rounded-lg p-2.5 border border-border/40">
                  <p className="text-[10px] text-muted-foreground">Locatie</p>
                  <p className="font-semibold">{baseLabel(sub.base_choice)}</p>
                </div>
                <div className="bg-background rounded-lg p-2.5 border border-border/40">
                  <p className="text-[10px] text-muted-foreground">Budget</p>
                  <p className="font-semibold">{sub.budget_cap_total ? `€${sub.budget_cap_total}` : "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(["require_fixed_beds", "require_bedrooms_3", "require_pool", "require_airco", "require_wifi", "require_parking", "require_terrace", "require_transparent_price"] as (keyof Submission)[]).map(field => {
                  const active = (sub as any)[field];
                  const labels: Record<string, string> = {
                    require_fixed_beds: "Bedden", require_bedrooms_3: "3 kamers", require_pool: "Zwembad",
                    require_airco: "Airco", require_wifi: "Wifi", require_parking: "Parking",
                    require_terrace: "Terras", require_transparent_price: "Transp. prijs",
                  };
                  return active ? <Badge key={field} className="text-[9px] bg-primary/10 text-primary border-primary/20">{labels[field]}</Badge> : null;
                })}
              </div>
            </div>
          )}

          {/* Activity stats */}
          <div className="flex gap-4 text-[10px] text-muted-foreground border-t border-border/40 pt-3">
            <span>{logins} logins</span>
            <span>{pageViews} pageviews</span>
            {lastActivity && <span>Laatst: {new Date(lastActivity).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AccommodationRow({ acc, onEliminate, onUndo, onFinalist, onTogglePrice, onEdit }: {
  acc: any; onEliminate: (id: string) => void; onUndo: (id: string) => void;
  onFinalist: (id: string) => void; onTogglePrice: (id: string, current: boolean) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className={`rounded-xl border p-3 space-y-2 transition-all ${
      acc.status === "eliminated" ? "border-border/30 opacity-50" :
      acc.status === "finalist" ? "border-warning/30 bg-warning/5" :
      "border-border/60"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{acc.name}</p>
            {acc.status === "finalist" && <Trophy className="h-3.5 w-3.5 text-warning shrink-0" />}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {acc.location_label} · {acc.bedrooms}k · {acc.fixed_beds_count}b · {acc.golf_minutes ?? "?"}m golf
            {acc.total_price_3_nights && ` · €${acc.total_price_3_nights}`}
          </p>
          {!acc.eligibility.eligible && <p className="text-[10px] text-destructive mt-1">{acc.eligibility.failures.join(", ")}</p>}
          {acc.eliminated_reason && <p className="text-[10px] text-muted-foreground italic mt-1">{acc.eliminated_reason}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-display font-extrabold text-sm text-primary">{acc.totalScore.toFixed(0)}</span>
          {acc.eligibility.eligible ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {acc.status === "active" && (
          <>
            <Button size="sm" variant="destructive" className="h-7 text-[11px] px-2.5 rounded-lg" onClick={() => onEliminate(acc.id)}>Elimineer</Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2.5 rounded-lg" onClick={() => onFinalist(acc.id)}><Trophy className="h-3 w-3 mr-1" /> Finalist</Button>
          </>
        )}
        {acc.status === "eliminated" && <Button size="sm" variant="outline" className="h-7 text-[11px] px-2.5 rounded-lg" onClick={() => onUndo(acc.id)}><Undo2 className="h-3 w-3 mr-1" /> Herstel</Button>}
        <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2.5 rounded-lg" onClick={() => onTogglePrice(acc.id, acc.transparent_price_confirmed)}>
          {acc.transparent_price_confirmed ? "✓ Prijs" : "Bevestig prijs"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2.5 rounded-lg" onClick={() => onEdit(acc.id)}>
          <Pencil className="h-3 w-3 mr-1" /> Bewerk
        </Button>
      </div>
    </div>
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
            <div key={item.label} className={`flex-1 text-center rounded-lg py-1.5 text-xs font-medium transition-colors ${
              isMajority ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-muted-foreground"
            }`}>
              {item.label} <span className="font-bold">{item.count}</span>/{total}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mobilityLabel(v: string) { return v === "car" ? "Huurauto" : v === "transfers" ? "Taxi" : "Neutraal"; }
function baseLabel(v: string) { return v === "golf" ? "Golf" : v === "beach" ? "Strand" : "Neutraal"; }
