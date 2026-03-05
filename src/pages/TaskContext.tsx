import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ReactionBar } from "@/components/ReactionBar";
import { SectionComments } from "@/components/SectionComments";
import { computeGroupRules, rankAccommodations, type Submission, type Accommodation } from "@/lib/scoring";
import {
  ArrowLeft, User, Shield, Globe, MapPin, Clock, Calendar,
  ExternalLink, Users, Car, CircleDot, Image, ChevronRight,
} from "lucide-react";

interface Profile { id: string; username: string; display_name: string; }
interface InfoDetails { url?: string; activity_date?: string; activity_time?: string; location?: string; }
interface Task {
  id: string; title: string; section: string; assigned_to: string | null;
  backup_to: string | null; progress: number; info_text: string | null;
  info_image_urls: string[]; info_details: InfoDetails;
}
interface Reaction { id: string; user_id: string; section: string; emoji: string; }
interface Comment { id: string; user_id: string; section: string; message: string; created_at: string; }

const SECTION_META: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  transport: { title: "Vervoer", icon: <Car className="h-5 w-5" />, color: "bg-blue-500/10 text-blue-600" },
  accommodatie: { title: "Accommodatie", icon: <MapPin className="h-5 w-5" />, color: "bg-emerald-500/10 text-emerald-600" },
  golf: { title: "Golfbaan", icon: <CircleDot className="h-5 w-5" />, color: "bg-green-500/10 text-green-600" },
  strand: { title: "Strand", icon: <Globe className="h-5 w-5" />, color: "bg-amber-500/10 text-amber-600" },
};

const SECTION_LINKS: Record<string, { label: string; url: string }[]> = {
  transport: [
    { label: "Rental24h.com – 9-zits busje", url: "https://www.rental24h.com" },
    { label: "KAYAK – Huurauto vergelijken", url: "https://www.kayak.com" },
    { label: "Kiwitaxi – Taxi/transfer boeken", url: "https://www.kiwitaxi.com" },
  ],
  accommodatie: [
    { label: "Bekijk alle accommodaties", url: "/accommodations" },
  ],
  golf: [
    { label: "La Cala Golf Resort – Officiële site", url: "https://www.lacala.com/golf" },
    { label: "TeeTime.es – Tee-times boeken", url: "https://www.teetime.es" },
  ],
  strand: [
    { label: "Google Maps – La Cala de Mijas strand", url: "https://maps.google.com/?q=La+Cala+de+Mijas+beach" },
  ],
};

export default function TaskContext() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const meta = SECTION_META[section || ""] || { title: section, icon: null, color: "" };
  const links = SECTION_LINKS[section || ""] || [];

  useEffect(() => {
    const load = async () => {
      const [t, p, s, a, r, c] = await Promise.all([
        supabase.from("tasks").select("*").order("sort_order"),
        supabase.from("profiles").select("*"),
        supabase.from("submissions").select("*"),
        supabase.from("accommodations").select("*"),
        supabase.from("reactions").select("*"),
        supabase.from("comments").select("*"),
      ]);
      setTasks((t.data as any[]) || []);
      setProfiles((p.data as any[]) || []);
      setSubmissions((s.data as any[]) || []);
      setAccommodations((a.data as any[]) || []);
      setReactions((r.data as any[]) || []);
      setComments((c.data as any[]) || []);
    };
    load();
  }, [section]);

  const handleToggleReaction = useCallback(async (sec: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find(r => r.user_id === user.id && r.section === sec && r.emoji === emoji);
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({ user_id: user.id, section: sec, emoji });
    }
    const { data } = await supabase.from("reactions").select("*");
    setReactions((data as any[]) || []);
  }, [user, reactions]);

  const handleAddComment = useCallback(async (sec: string, message: string) => {
    if (!user) return;
    await supabase.from("comments").insert({ user_id: user.id, section: sec, message });
    const { data } = await supabase.from("comments").select("*");
    setComments((data as any[]) || []);
  }, [user]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    const { data } = await supabase.from("comments").select("*");
    setComments((data as any[]) || []);
  }, []);

  // Section-specific tasks
  const sectionTasks = tasks.filter(t => t.section === section);
  const mainTask = sectionTasks[0];

  // Group rules & ranked accommodations (for accommodatie section)
  const groupRules = submissions.length > 0 ? computeGroupRules(submissions as Submission[]) : null;
  const ranked = section === "accommodatie" && groupRules
    ? rankAccommodations(accommodations as Accommodation[], submissions as Submission[], groupRules).filter(a => a.eligibility.eligible).slice(0, 3)
    : [];

  // Aggregate group wishes relevant to section
  const groupWishes = getGroupWishes(section || "", submissions);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <AppLayout>
      <div className="-mx-4 -mt-6">
        {/* Header */}
        <section className="bg-foreground text-white px-6 py-8">
          <button onClick={() => navigate("/taken")} className="flex items-center gap-1.5 text-white/50 text-xs mb-4 hover:text-white/80 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Terug naar taken
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${meta.color}`}>{meta.icon}</div>
            <div>
              <h1 className="font-display text-2xl font-extrabold">{meta.title}</h1>
              {mainTask && (
                <p className="text-white/50 text-xs mt-0.5">
                  Taak: {mainTask.title} · {mainTask.progress}% klaar
                </p>
              )}
            </div>
          </div>
          {mainTask && (
            <div className="flex gap-2 mt-3">
              {mainTask.assigned_to && (
                <Badge className="bg-white/10 text-white/80 text-[10px]">
                  <User className="h-3 w-3 mr-1" />{mainTask.assigned_to}
                </Badge>
              )}
              {mainTask.backup_to && (
                <Badge className="bg-white/5 text-white/50 text-[10px]">
                  <Shield className="h-3 w-3 mr-1" />{mainTask.backup_to}
                </Badge>
              )}
            </div>
          )}
        </section>

        <div className="px-6 py-6 pb-24 space-y-6">

          {/* ── Groepswensen ── */}
          {groupWishes.length > 0 && (
            <div>
              <SectionHeader icon={<Users className="h-4 w-4" />} label="Groepswensen" />
              <Card className="border-border/60">
                <CardContent className="p-4 space-y-2">
                  {groupWishes.map((wish, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground">{wish}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Verzamelde details ── */}
          {mainTask && (
            <div>
              <SectionHeader icon={<Calendar className="h-4 w-4" />} label="Verzamelde details" />
              <TaskDetailsSummary task={mainTask} formatDate={formatDate} />
            </div>
          )}

          {/* ── Foto's ── */}
          {mainTask && mainTask.info_image_urls.length > 0 && (
            <div>
              <SectionHeader icon={<Image className="h-4 w-4" />} label="Foto's" />
              <div className="grid grid-cols-2 gap-2">
                {mainTask.info_image_urls.map((url, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                    onClick={() => setLightboxUrl(url)}>
                    <img src={url} alt="" className="w-full h-28 object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section-specific content ── */}
          {section === "transport" && <TransportBlock />}
          {section === "accommodatie" && ranked.length > 0 && <AccommodatieBlock ranked={ranked} navigate={navigate} />}
          {section === "golf" && <GolfBlock />}
          {section === "strand" && <StrandBlock />}

          {/* ── Externe bronnen ── */}
          {links.length > 0 && (
            <div>
              <SectionHeader icon={<Globe className="h-4 w-4" />} label="Externe bronnen" />
              <Card className="border-border/60">
                <CardContent className="p-4 space-y-2.5">
                  {links.map((link, i) => {
                    const isInternal = link.url.startsWith("/");
                    return (
                      <a
                        key={i}
                        href={isInternal ? undefined : link.url}
                        onClick={isInternal ? (e) => { e.preventDefault(); navigate(link.url); } : undefined}
                        target={isInternal ? undefined : "_blank"}
                        rel={isInternal ? undefined : "noopener noreferrer"}
                        className="flex items-center justify-between gap-2 text-sm text-primary hover:underline"
                      >
                        <span>{link.label}</span>
                        {isInternal ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      </a>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Reacties & Comments ── */}
          <div>
            <SectionHeader icon={<Users className="h-4 w-4" />} label="Reacties" />
            <div className="space-y-2">
              <ReactionBar section={`context-${section}`} reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
              <SectionComments
                section={`context-${section}`}
                comments={comments}
                profiles={profiles}
                onAdd={handleAddComment}
                onDelete={handleDeleteComment}
              />
            </div>
          </div>
        </div>

        {/* Lightbox */}
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 border-border">
            {lightboxUrl && <img src={lightboxUrl} alt="" className="w-full h-full object-contain rounded-lg" />}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

/* ── Helpers ── */

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-primary">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{label}</p>
    </div>
  );
}

function TaskDetailsSummary({ task, formatDate }: { task: Task; formatDate: (d: string) => string }) {
  const details: InfoDetails = (task.info_details as any) || {};
  const hasAny = details.url || details.activity_date || details.activity_time || details.location || task.info_text;
  if (!hasAny) {
    return (
      <Card className="border-border/60 border-dashed">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Nog geen details ingevuld door de eigenaar.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-2">
        {details.url && (
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
            <a href={details.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{details.url}</a>
          </div>
        )}
        {details.activity_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{formatDate(details.activity_date)}</span>
          </div>
        )}
        {details.activity_time && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{details.activity_time}</span>
          </div>
        )}
        {details.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{details.location}</span>
          </div>
        )}
        {task.info_text && (
          <p className="text-sm text-muted-foreground pt-2 border-t border-primary/10">{task.info_text}</p>
        )}
      </CardContent>
    </Card>
  );
}

function getGroupWishes(section: string, submissions: Submission[]): string[] {
  if (submissions.length === 0) return [];
  const n = submissions.length;
  const avg = (fn: (s: Submission) => number) => (submissions.reduce((a, s) => a + fn(s), 0) / n).toFixed(1);

  const wishes: string[] = [];

  if (section === "transport") {
    const busCount = submissions.filter(s => s.mobility_choice === "car").length;
    const taxiCount = submissions.filter(s => s.mobility_choice === "taxi").length;
    wishes.push(`Voorkeur busje: ${busCount}/${n} · taxi: ${taxiCount}/${n}`);
    wishes.push(`Gemiddeld belang "min. gedoe": ${avg(s => s.points_low_hassle)} / 5`);
    wishes.push(`Gemiddeld belang "budget": ${avg(s => s.points_budget)} / 5`);
  }

  if (section === "accommodatie") {
    const majority = Math.ceil(n / 2);
    const count = (fn: (s: Submission) => boolean) => submissions.filter(fn).length;
    if (count(s => s.require_fixed_beds) >= majority) wishes.push("Meerderheid eist vaste bedden");
    if (count(s => s.require_bedrooms_3) >= majority) wishes.push("Meerderheid eist min. 3 slaapkamers");
    if (count(s => s.require_cancelable) >= majority) wishes.push("Meerderheid eist gratis annulering");
    if (count(s => s.require_pool) >= majority) wishes.push("Meerderheid eist zwembad");
    const budgets = submissions.map(s => s.budget_cap_total).filter((b): b is number => b !== null && b > 0);
    if (budgets.length > 0) wishes.push(`Budget plafond: €${Math.min(...budgets)} (laagste)`);
    wishes.push(`Gemiddeld belang "luxe": ${avg(s => s.points_luxury)} / 5`);
    const baseChoices = submissions.map(s => s.base_choice);
    const golfCount = baseChoices.filter(c => c === "golf").length;
    const beachCount = baseChoices.filter(c => c === "beach").length;
    wishes.push(`Locatievoorkeur: golf ${golfCount}/${n} · strand ${beachCount}/${n}`);
  }

  if (section === "golf") {
    const rounds = submissions.map(s => s.preferred_rounds);
    wishes.push(`Voorkeur rondes: gem. ${(rounds.reduce((a, b) => a + b, 0) / n).toFixed(1)}`);
    const maxMins = submissions.map(s => s.max_golf_minutes).sort((a, b) => a - b);
    wishes.push(`Max reistijd golf: mediaan ${maxMins[Math.floor(n / 2)]} min`);
    wishes.push(`Gemiddeld belang "golf gemak": ${avg(s => s.points_golf_ease)} / 5`);
  }

  if (section === "strand") {
    wishes.push(`Gemiddeld belang "strandleven": ${avg(s => s.points_beach_life)} / 5`);
    wishes.push(`Gemiddeld belang "omgeving verkennen": ${avg(s => s.points_exploring)} / 5`);
    const beachPref = submissions.filter(s => s.base_choice === "beach").length;
    wishes.push(`${beachPref}/${n} kiest voorkeur strand/dorp`);
  }

  return wishes;
}

/* ── Section-specific blocks ── */

function TransportBlock() {
  return (
    <div>
      <SectionHeader icon={<Car className="h-4 w-4" />} label="Vervoersopties" />
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Optie A</p>
            <p className="font-display font-bold text-sm mb-1">9-zits busje</p>
            <p className="text-lg font-extrabold text-foreground">€265 – €470</p>
            <p className="text-xs text-muted-foreground mt-1">€44 – €78 p.p.</p>
            <p className="text-xs text-muted-foreground">Maximale flexibiliteit</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Optie B</p>
            <p className="font-display font-bold text-sm mb-1">Taxi / transfer</p>
            <p className="text-lg font-extrabold text-foreground">€200 – €340</p>
            <p className="text-xs text-muted-foreground mt-1">€37 – €57 p.p.</p>
            <p className="text-xs text-muted-foreground">~5 lokale ritten nodig</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AccommodatieBlock({ ranked, navigate }: { ranked: any[]; navigate: (path: string) => void }) {
  return (
    <div>
      <SectionHeader icon={<MapPin className="h-4 w-4" />} label="Top accommodaties" />
      <div className="space-y-2">
        {ranked.map((acc, i) => (
          <Card key={acc.id} className="border-border/60 cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => navigate(`/accommodations/${acc.id}`)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="bg-primary/10 text-primary font-bold rounded-full w-7 h-7 flex items-center justify-center text-xs shrink-0">
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm truncate">{acc.name}</p>
                <p className="text-xs text-muted-foreground">{acc.location_label} · Score: {acc.totalScore.toFixed(1)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GolfBlock() {
  return (
    <div>
      <SectionHeader icon={<CircleDot className="h-4 w-4" />} label="Golfbaan info" />
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-2.5">
          <p className="font-display font-bold text-sm">La Cala Golf Resort</p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> La Cala de Mijas, Málaga</p>
            <p className="flex items-center gap-2"><CircleDot className="h-3.5 w-3.5 text-primary shrink-0" /> 3 banen: Asia, America, Europa (elk 18 holes)</p>
            <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary shrink-0" /> Eerste tee-time: vaak vanaf 08:00</p>
            <p className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-primary shrink-0" /> Green fee: ~€60 – €90 per ronde</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StrandBlock() {
  return (
    <div>
      <SectionHeader icon={<Globe className="h-4 w-4" />} label="Strand & omgeving" />
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-2.5">
          <p className="font-display font-bold text-sm">La Cala de Mijas</p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> Gezellig kustdorpje met strand, restaurants en winkels</p>
            <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary shrink-0" /> Vanaf golfbaan: ~10-15 min rijden</p>
            <p className="flex items-center gap-2"><CircleDot className="h-3.5 w-3.5 text-primary shrink-0" /> Strandtenten: diverse chiringuitos direct aan zee</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
