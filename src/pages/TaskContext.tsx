import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ReactionBar } from "@/components/ReactionBar";
import { SectionComments } from "@/components/SectionComments";
import { computeGroupRules, rankAccommodations, checkEligibility, type Submission, type Accommodation, type GroupRules } from "@/lib/scoring";
import {
  ArrowLeft, User, Shield, MapPin, Clock, Calendar,
  ExternalLink, Users, Car, ChevronRight, CheckCircle2, XCircle,
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

const SECTION_TITLES: Record<string, string> = {
  transport: "Vervoer",
  accommodatie: "Accommodatie",
  golf: "Golfbaan",
  strand: "Strand & omgeving",
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

  const sectionTasks = tasks.filter(t => t.section === section);
  const mainTask = sectionTasks[0];
  const n = submissions.length;
  const groupRules = n > 0 ? computeGroupRules(submissions as Submission[]) : null;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <section className="bg-foreground text-white px-6 py-6">
          <button onClick={() => navigate("/taken")} className="flex items-center gap-1.5 text-white/50 text-xs mb-3 hover:text-white/80 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Terug naar taken
          </button>
          <h1 className="font-display text-xl font-extrabold">{SECTION_TITLES[section || ""] || section}</h1>
          {mainTask && (
            <p className="text-white/50 text-xs mt-1">Taak: {mainTask.title} · {mainTask.progress}% klaar</p>
          )}
          {mainTask && (
            <div className="flex gap-2 mt-2">
              {mainTask.assigned_to && (
                <Badge className="bg-white/10 text-white/80 text-[10px]">
                  <User className="h-3 w-3 mr-1" />Eigenaar: {mainTask.assigned_to}
                </Badge>
              )}
              {mainTask.backup_to && (
                <Badge className="bg-white/5 text-white/50 text-[10px]">
                  <Shield className="h-3 w-3 mr-1" />Backup: {mainTask.backup_to}
                </Badge>
              )}
            </div>
          )}
        </section>

        <div className="px-6 py-5 pb-24 space-y-5">

          {/* ── Stemmen & voorkeuren ── */}
          {n > 0 && (
            <ContextBlock title="Stemmen & groepswensen">
              {section === "transport" && <TransportWishes submissions={submissions} n={n} />}
              {section === "accommodatie" && <AccommodatieWishes submissions={submissions} n={n} groupRules={groupRules} />}
              {section === "golf" && <GolfWishes submissions={submissions} n={n} />}
              {section === "strand" && <StrandWishes submissions={submissions} n={n} />}
            </ContextBlock>
          )}

          {/* ── Verzamelde info door eigenaar ── */}
          {mainTask && (
            <ContextBlock title="Verzamelde details">
              <TaskDetailsSummary task={mainTask} formatDate={formatDate} />
            </ContextBlock>
          )}

          {/* ── Foto's ── */}
          {mainTask && mainTask.info_image_urls.length > 0 && (
            <ContextBlock title="Foto's">
              <div className="grid grid-cols-2 gap-2">
                {mainTask.info_image_urls.map((url, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                    onClick={() => setLightboxUrl(url)}>
                    <img src={url} alt="" className="w-full h-28 object-cover" />
                  </div>
                ))}
              </div>
            </ContextBlock>
          )}

          {/* ── Sectie-specifieke inhoud ── */}
          {section === "transport" && <TransportInfo />}
          {section === "accommodatie" && groupRules && (
            <AccommodatieInfo accommodations={accommodations} submissions={submissions} groupRules={groupRules} navigate={navigate} />
          )}
          {section === "golf" && <GolfInfo />}
          {section === "strand" && <StrandInfo />}

          {/* ── Externe links ── */}
          <ExternalLinks section={section || ""} navigate={navigate} />

          {/* ── Reacties ── */}
          <ContextBlock title="Reacties">
            <ReactionBar section={`context-${section}`} reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
            <SectionComments
              section={`context-${section}`}
              comments={comments}
              profiles={profiles}
              onAdd={handleAddComment}
              onDelete={handleDeleteComment}
            />
          </ContextBlock>
        </div>

        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 border-border">
            {lightboxUrl && <img src={lightboxUrl} alt="" className="w-full h-full object-contain rounded-lg" />}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

/* ── Layout helpers ── */

function ContextBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

/* ── Task details summary ── */

function TaskDetailsSummary({ task, formatDate }: { task: Task; formatDate: (d: string) => string }) {
  const details: InfoDetails = (task.info_details as any) || {};
  const hasAny = details.url || details.activity_date || details.activity_time || details.location || task.info_text;
  if (!hasAny) {
    return <p className="text-sm text-muted-foreground italic">Nog geen details ingevuld door de eigenaar.</p>;
  }
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-1.5">
        {details.url && (
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
            <a href={details.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{details.url}</a>
          </div>
        )}
        {details.activity_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{formatDate(details.activity_date)}</span>
          </div>
        )}
        {details.activity_time && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{details.activity_time}</span>
          </div>
        )}
        {details.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{details.location}</span>
          </div>
        )}
        {task.info_text && (
          <p className="text-sm text-muted-foreground pt-2 border-t border-border/30">{task.info_text}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Wishes per section ── */

function TransportWishes({ submissions, n }: { submissions: Submission[]; n: number }) {
  const carVotes = submissions.filter(s => s.mobility_choice === "car").length;
  const taxiVotes = submissions.filter(s => s.mobility_choice === "taxi").length;
  const neutralVotes = n - carVotes - taxiVotes;
  const avg = (fn: (s: Submission) => number) => (submissions.reduce((a, s) => a + fn(s), 0) / n).toFixed(1);

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-sm font-medium mb-2">Vervoervoorkeur groep</p>
        <div className="space-y-1">
          <InfoLine label="🚗 Huurauto / busje" value={`${carVotes} van ${n} stemmen`} />
          <InfoLine label="🚕 Taxi / transfer" value={`${taxiVotes} van ${n} stemmen`} />
          {neutralVotes > 0 && <InfoLine label="🤷 Geen voorkeur" value={`${neutralVotes} van ${n}`} />}
        </div>
        {carVotes === taxiVotes && carVotes > 0 && (
          <p className="text-xs text-destructive mt-2 font-medium">⚠️ Stemmen staan gelijk — overleg nodig</p>
        )}
        <div className="mt-3 pt-2 border-t border-border/30 space-y-1">
          <InfoLine label={'Belang "minimaal gedoe"'} value={`${avg(s => s.points_low_hassle)} / 5`} />
          <InfoLine label={'Belang "budget"'} value={`${avg(s => s.points_budget)} / 5`} />
        </div>
      </CardContent>
    </Card>
  );
}

function AccommodatieWishes({ submissions, n, groupRules }: { submissions: Submission[]; n: number; groupRules: GroupRules | null }) {
  const count = (fn: (s: Submission) => boolean) => submissions.filter(fn).length;
  const avg = (fn: (s: Submission) => number) => (submissions.reduce((a, s) => a + fn(s), 0) / n).toFixed(1);
  const budgets = submissions.map(s => s.budget_cap_total).filter((b): b is number => b !== null && b > 0);
  const golfCount = submissions.filter(s => s.base_choice === "golf").length;
  const beachCount = submissions.filter(s => s.base_choice === "beach").length;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-sm font-medium mb-2">Eisen meerderheid</p>
        <div className="space-y-1">
          {groupRules?.requireFixedBeds && <InfoLine label="Vaste bedden" value={`${count(s => s.require_fixed_beds)}/${n} eist dit`} />}
          {groupRules?.requireBedrooms3 && <InfoLine label="Min. 3 slaapkamers" value={`${count(s => s.require_bedrooms_3)}/${n} eist dit`} />}
          {groupRules?.requireCancelable && <InfoLine label="Gratis annulering" value={`${count(s => s.require_cancelable)}/${n} eist dit`} />}
          {groupRules?.requirePool && <InfoLine label="Zwembad" value={`${count(s => s.require_pool)}/${n} eist dit`} />}
        </div>
        <div className="mt-3 pt-2 border-t border-border/30 space-y-1">
          {budgets.length > 0 && <InfoLine label="Budget plafond (laagste)" value={`€${Math.min(...budgets)}`} />}
          <InfoLine label={'Belang "luxe"'} value={`${avg(s => s.points_luxury)} / 5`} />
          <InfoLine label="Locatievoorkeur golf" value={`${golfCount}/${n} stemmen`} />
          <InfoLine label="Locatievoorkeur strand" value={`${beachCount}/${n} stemmen`} />
        </div>
      </CardContent>
    </Card>
  );
}

function GolfWishes({ submissions, n }: { submissions: Submission[]; n: number }) {
  const avg = (fn: (s: Submission) => number) => (submissions.reduce((a, s) => a + fn(s), 0) / n).toFixed(1);
  const maxMins = submissions.map(s => s.max_golf_minutes).sort((a, b) => a - b);
  const median = maxMins[Math.floor(n / 2)];

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-sm font-medium mb-2">Golfvoorkeuren groep</p>
        <div className="space-y-1">
          <InfoLine label="Gewenste rondes" value={`gem. ${avg(s => s.preferred_rounds)}`} />
          <InfoLine label="Max reistijd golfbaan" value={`mediaan ${median} min`} />
          <InfoLine label={'Belang "golf gemak"'} value={`${avg(s => s.points_golf_ease)} / 5`} />
        </div>
      </CardContent>
    </Card>
  );
}

function StrandWishes({ submissions, n }: { submissions: Submission[]; n: number }) {
  const avg = (fn: (s: Submission) => number) => (submissions.reduce((a, s) => a + fn(s), 0) / n).toFixed(1);
  const beachPref = submissions.filter(s => s.base_choice === "beach").length;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-sm font-medium mb-2">Strand & omgeving voorkeuren</p>
        <div className="space-y-1">
          <InfoLine label={'Belang "strandleven"'} value={`${avg(s => s.points_beach_life)} / 5`} />
          <InfoLine label={'Belang "omgeving verkennen"'} value={`${avg(s => s.points_exploring)} / 5`} />
          <InfoLine label="Voorkeur strand/dorp" value={`${beachPref}/${n} stemmen`} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Section-specific content ── */

function TransportInfo() {
  return (
    <ContextBlock title="Vervoersopties vergeleken">
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-sm font-medium">Optie A: 9-zits huurbusje</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {"Geschatte kosten €265 – €470 totaal (€44 – €78 p.p.). Geeft maximale flexibiliteit: zelf rijden naar golfbaan, strand, restaurants en supermarkt. Parkeren bij villa meestal gratis."}
            </p>
          </div>
          <div className="border-t border-border/30 pt-3">
            <p className="text-sm font-medium">Optie B: Taxi / transfer</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {"Luchthaven-transfer €200 – €340 retour (€37 – €57 p.p.). Lokaal ~5 taxiritten nodig voor golfbaan en uitjes. Minder flexibel, maar geen gedoe met rijden en parkeren."}
            </p>
          </div>
        </CardContent>
      </Card>
    </ContextBlock>
  );
}

function AccommodatieInfo({ accommodations, submissions, groupRules, navigate }: {
  accommodations: Accommodation[];
  submissions: Submission[];
  groupRules: GroupRules;
  navigate: (path: string) => void;
}) {
  const ranked = rankAccommodations(accommodations, submissions, groupRules);

  return (
    <ContextBlock title="Alle accommodaties">
      <div className="space-y-3">
        {ranked.map((acc, i) => {
          const eligible = acc.eligibility.eligible;
          const ppn = acc.total_price_3_nights
            ? `€${Math.round(acc.total_price_3_nights / 3)} p/nacht`
            : "Prijs onbekend";

          return (
            <Card key={acc.id} className={`border-border/60 ${!eligible ? "opacity-70" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">{acc.location_label} · {acc.type} · {ppn}</p>
                  </div>
                  <Badge variant={eligible ? "default" : "outline"} className={`text-[10px] shrink-0 ${eligible ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                    #{i + 1} · {acc.totalScore.toFixed(1)} pt
                  </Badge>
                </div>

                {/* Kenmerken */}
                <p className="text-xs text-muted-foreground">
                  {acc.bedrooms} slpk · {acc.bathrooms} badk · {acc.fixed_beds_count} vaste bedden · max {acc.max_guests} gasten
                </p>
                {acc.golf_minutes != null && (
                  <p className="text-xs text-muted-foreground">Reistijd golf: {acc.golf_minutes} min</p>
                )}
                {acc.beach_meters != null && (
                  <p className="text-xs text-muted-foreground">Afstand strand: {acc.beach_meters}m</p>
                )}

                {/* Voorwaarden check */}
                {eligible ? (
                  <p className="text-xs text-primary mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Voldoet aan alle groepseisen
                  </p>
                ) : (
                  <div className="mt-2 space-y-0.5">
                    {acc.eligibility.failures.map((f, fi) => (
                      <p key={fi} className="text-xs text-destructive flex items-center gap-1">
                        <XCircle className="h-3 w-3 shrink-0" /> {f}
                      </p>
                    ))}
                  </div>
                )}

                {/* Notities */}
                {acc.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{acc.notes}</p>
                )}

                {/* Top redenen */}
                <p className="text-[10px] text-muted-foreground mt-2">
                  Sterkste punten: {acc.topReasons.join(" · ")}
                </p>

                <button
                  onClick={() => navigate(`/accommodations/${acc.id}`)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-2"
                >
                  Bekijk details <ChevronRight className="h-3 w-3" />
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ContextBlock>
  );
}

const GOLF_COURSES = [
  { name: "La Cala Golf Resort", distance: "Op locatie (0 min)", desc: "3 banen (Asia, America, Europa), elk 18 holes. Green fee ca. \u20AC60\u2013\u20AC90. Eerste tee-time vaak vanaf 08:00.", url: "https://www.lacala.com/golf" },
  { name: "Chaparral Golf Club", distance: "~10 min rijden", desc: "18-holes baan ontworpen door Pepe Gancedo. Onderhouden baan met goede faciliteiten.", url: "https://www.chaparralgolf.com" },
  { name: "Santana Golf", distance: "~12 min rijden", desc: "18-holes par-72 baan in Mijas Costa. Gevarieerd terrein met uitzicht op zee.", url: "https://www.santanagolf.com" },
  { name: "Calanova Golf", distance: "~15 min rijden", desc: "18-holes baan bij Mijas Pueblo. Bergachtig terrein, mooie uitzichten.", url: "https://www.calanovagolf.com" },
  { name: "Miraflores Golf", distance: "~8 min rijden", desc: "18-holes baan, goed onderhouden. Populair bij internationale golfers.", url: "https://www.mirafloresgolf.com" },
];

function GolfInfo() {
  return (
    <ContextBlock title="Golfbanen in de buurt">
      <div className="space-y-2">
        {GOLF_COURSES.map((course, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{course.name}</p>
                <Badge variant="outline" className="text-[10px] shrink-0">{course.distance}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{course.desc}</p>
              <a href={course.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
                Website <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </ContextBlock>
  );
}

function StrandInfo() {
  return (
    <ContextBlock title="Strand & omgeving">
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium">La Cala de Mijas</p>
          <p className="text-xs text-muted-foreground">
            {"Gezellig kustdorpje met breed zandstrand, diverse chiringuitos (strandtenten) direct aan zee, restaurants en winkeltjes. Vanaf de meeste accommodaties ~10\u201315 min rijden. Goed bereikbaar en minder toeristisch dan Fuengirola of Marbella."}
          </p>
          <p className="text-xs text-muted-foreground">
            {"In de buurt: Fuengirola (20 min), Marbella (30 min), Mijas Pueblo (15 min, pittoresk bergdorpje)."}
          </p>
        </CardContent>
      </Card>
    </ContextBlock>
  );
}

/* ── External links ── */

const SECTION_LINKS: Record<string, { label: string; url: string }[]> = {
  transport: [
    { label: "Rental24h.com – 9-zits busje", url: "https://www.rental24h.com" },
    { label: "KAYAK – Huurauto vergelijken", url: "https://www.kayak.com" },
    { label: "Kiwitaxi – Taxi/transfer boeken", url: "https://www.kiwitaxi.com" },
  ],
  accommodatie: [
    { label: "Alle accommodaties bekijken", url: "/accommodations" },
  ],
  golf: [
    { label: "TeeTime.es – Tee-times boeken", url: "https://www.teetime.es" },
  ],
  strand: [
    { label: "Google Maps – La Cala de Mijas strand", url: "https://maps.google.com/?q=La+Cala+de+Mijas+beach" },
  ],
};

function ExternalLinks({ section, navigate }: { section: string; navigate: (path: string) => void }) {
  const links = SECTION_LINKS[section] || [];
  if (links.length === 0) return null;

  return (
    <ContextBlock title="Handige links">
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-2">
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
    </ContextBlock>
  );
}
