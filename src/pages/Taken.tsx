import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ReactionBar } from "@/components/ReactionBar";
import { SectionComments } from "@/components/SectionComments";
import {
  Plane, ChevronDown, CheckCircle2, Upload, ExternalLink, Image as ImageIcon, User, Shield, X
} from "lucide-react";

interface Profile { id: string; username: string; display_name: string; }
interface Task {
  id: string; title: string; section: string; assigned_to: string | null;
  backup_to: string | null; status: string; sort_order: number;
  voting_closed: boolean; progress: number; info_text: string | null;
  info_image_urls: string[];
}
interface TravelLeg {
  id: string; passengers: string[]; departure_time: string | null;
  arrival_time: string | null; travel_date: string | null;
  note: string | null; sort_order: number;
}
interface Reaction { id: string; user_id: string; section: string; emoji: string; }
interface Comment { id: string; user_id: string; section: string; message: string; created_at: string; }

const TASK_LINKS: Record<string, { label: string; href: string }> = {
  car: { label: "Vervoersoverzicht", href: "/info" },
  accommodation: { label: "Accommodaties bekijken", href: "/accommodations" },
  flights: { label: "Vluchtinfo", href: "/info" },
  lounge: { label: "Strandinfo", href: "/info" },
};

export default function Taken() {
  const { user, profile, isAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [travelLegs, setTravelLegs] = useState<TravelLeg[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [editingLeg, setEditingLeg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [t, tl, p, r, c] = await Promise.all([
        supabase.from("tasks").select("*").order("sort_order"),
        supabase.from("travel_legs").select("*").order("sort_order"),
        supabase.from("profiles").select("*"),
        supabase.from("reactions").select("*"),
        supabase.from("comments").select("*"),
      ]);
      setTasks((t.data as any[]) || []);
      setTravelLegs((tl.data as any[]) || []);
      setProfiles((p.data as any[]) || []);
      setReactions((r.data as any[]) || []);
      setComments((c.data as any[]) || []);
    };
    load();

    const channel = supabase
      .channel("taken-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        supabase.from("tasks").select("*").order("sort_order").then(r => setTasks((r.data as any[]) || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "travel_legs" }, () => {
        supabase.from("travel_legs").select("*").order("sort_order").then(r => setTravelLegs((r.data as any[]) || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => {
        supabase.from("reactions").select("*").then(r => setReactions((r.data as any[]) || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        supabase.from("comments").select("*").then(r => setComments((r.data as any[]) || []));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleToggleReaction = useCallback(async (section: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find(r => r.user_id === user.id && r.section === section && r.emoji === emoji);
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({ user_id: user.id, section, emoji });
    }
  }, [user, reactions]);

  const handleAddComment = useCallback(async (section: string, message: string) => {
    if (!user) return;
    await supabase.from("comments").insert({ user_id: user.id, section, message });
  }, [user]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
  }, []);

  const canEditTask = (task: Task) => {
    if (isAdmin) return true;
    if (!profile) return false;
    return task.assigned_to === profile.display_name || task.backup_to === profile.display_name;
  };

  const handleProgressChange = async (taskId: string, value: number[]) => {
    await supabase.from("tasks").update({ progress: value[0] }).eq("id", taskId);
  };

  const handleInfoTextSave = async (taskId: string, text: string) => {
    await supabase.from("tasks").update({ info_text: text || null }).eq("id", taskId);
  };

  const handleImageUpload = async (taskId: string, file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${taskId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("task-attachments").upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("task-attachments").getPublicUrl(path);
      const task = tasks.find(t => t.id === taskId);
      const urls = [...(task?.info_image_urls || []), urlData.publicUrl];
      await supabase.from("tasks").update({ info_image_urls: urls }).eq("id", taskId);
    }
    setUploading(false);
  };

  const handleRemoveImage = async (taskId: string, url: string) => {
    const task = tasks.find(t => t.id === taskId);
    const urls = (task?.info_image_urls || []).filter(u => u !== url);
    await supabase.from("tasks").update({ info_image_urls: urls }).eq("id", taskId);
  };

  const handleAssign = async (taskId: string, field: "assigned_to" | "backup_to", value: string) => {
    await supabase.from("tasks").update({ [field]: value || null }).eq("id", taskId);
  };

  const handleLegUpdate = async (legId: string, updates: Partial<TravelLeg>) => {
    await supabase.from("travel_legs").update(updates).eq("id", legId);
    setEditingLeg(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
  };

  return (
    <AppLayout>
      <div className="-mx-4 -mt-6">
        {/* Header */}
        <section className="bg-foreground text-white px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">Organisatie</p>
          <h1 className="font-display text-2xl font-extrabold">Takenverdeling</h1>
          <p className="text-white/60 text-sm mt-1">Voortgang, vluchtgegevens en taakverdeling</p>
        </section>

        {/* ═══ VLUCHTGEGEVENS ═══ */}
        <section className="border-b border-border px-6 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Plane className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Vluchtgegevens</p>
          </div>

          <div className="space-y-2">
            {travelLegs.map(leg => (
              <Card key={leg.id} className="border-border/60">
                <CardContent className="p-3">
                  {editingLeg === leg.id && isAdmin ? (
                    <TravelLegEditor leg={leg} onSave={(u) => handleLegUpdate(leg.id, u)} onCancel={() => setEditingLeg(null)} />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-display font-bold text-sm">{leg.passengers.join(", ")}</p>
                        {leg.note ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{leg.note}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(leg.travel_date)} · {leg.departure_time} → {leg.arrival_time}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingLeg(leg.id)}>
                          Bewerken
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ═══ TAKEN ═══ */}
        <section className="px-6 py-6 pb-24">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Taken</p>
          </div>

          <div className="space-y-3">
            {tasks.map(task => {
              const isOpen = openTask === task.id;
              const editable = canEditTask(task);
              const link = TASK_LINKS[task.section];

              return (
                <Collapsible key={task.id} open={isOpen} onOpenChange={(o) => setOpenTask(o ? task.id : null)}>
                  <Card className="border-border/60 overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-4 cursor-pointer">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-display font-bold text-sm flex-1">{task.title}</p>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {task.assigned_to && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                              <User className="h-3 w-3 mr-1" />{task.assigned_to}
                            </Badge>
                          )}
                          {task.backup_to && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              <Shield className="h-3 w-3 mr-1" />{task.backup_to}
                            </Badge>
                          )}
                        </div>
                        <Progress value={task.progress} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground mt-1">{task.progress}% gereed</p>
                      </CardContent>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
                        {/* Progress slider */}
                        {editable && (
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Voortgang</label>
                            <Slider
                              value={[task.progress]}
                              max={100}
                              step={5}
                              onValueCommit={(v) => handleProgressChange(task.id, v)}
                            />
                          </div>
                        )}

                        {/* Info text */}
                        {editable ? (
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status update</label>
                            <Textarea
                              defaultValue={task.info_text || ""}
                              placeholder="Deel een update over deze taak..."
                              className="text-xs min-h-[60px]"
                              onBlur={(e) => handleInfoTextSave(task.id, e.target.value)}
                            />
                          </div>
                        ) : task.info_text ? (
                          <div className="bg-secondary rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">{task.info_text}</p>
                          </div>
                        ) : null}

                        {/* Images */}
                        {(task.info_image_urls.length > 0 || editable) && (
                          <div>
                            {task.info_image_urls.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                {task.info_image_urls.map((url, i) => (
                                  <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                                    <img src={url} alt="" className="w-full h-24 object-cover" />
                                    {editable && (
                                      <button
                                        onClick={() => handleRemoveImage(task.id, url)}
                                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {editable && (
                              <label className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                                <Upload className="h-3 w-3" />
                                {uploading ? "Uploaden..." : "Foto toevoegen"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => e.target.files?.[0] && handleImageUpload(task.id, e.target.files[0])}
                                  disabled={uploading}
                                />
                              </label>
                            )}
                          </div>
                        )}

                        {/* Link */}
                        {link && (
                          <a href={link.href} className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                            {link.label} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        {/* Admin assign */}
                        {isAdmin && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Eigenaar</label>
                              <Select value={task.assigned_to || ""} onValueChange={(v) => handleAssign(task.id, "assigned_to", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kies..." /></SelectTrigger>
                                <SelectContent>
                                  {profiles.map(p => <SelectItem key={p.id} value={p.display_name}>{p.display_name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Backup</label>
                              <Select value={task.backup_to || ""} onValueChange={(v) => handleAssign(task.id, "backup_to", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kies..." /></SelectTrigger>
                                <SelectContent>
                                  {profiles.map(p => <SelectItem key={p.id} value={p.display_name}>{p.display_name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* Reactions & Comments */}
                        <ReactionBar section={`task-${task.id}`} reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
                        <SectionComments
                          section={`task-${task.id}`}
                          comments={comments}
                          profiles={profiles}
                          onAdd={handleAddComment}
                          onDelete={handleDeleteComment}
                        />
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

/* ── Inline travel leg editor ── */
function TravelLegEditor({ leg, onSave, onCancel }: {
  leg: TravelLeg;
  onSave: (updates: Partial<TravelLeg>) => void;
  onCancel: () => void;
}) {
  const [passengers, setPassengers] = useState(leg.passengers.join(", "));
  const [dep, setDep] = useState(leg.departure_time || "");
  const [arr, setArr] = useState(leg.arrival_time || "");
  const [date, setDate] = useState(leg.travel_date || "");
  const [note, setNote] = useState(leg.note || "");

  return (
    <div className="space-y-2">
      <Input value={passengers} onChange={e => setPassengers(e.target.value)} placeholder="Passagiers (komma-gescheiden)" className="text-xs h-8" />
      <div className="grid grid-cols-3 gap-2">
        <Input value={dep} onChange={e => setDep(e.target.value)} placeholder="Vertrek" className="text-xs h-8" />
        <Input value={arr} onChange={e => setArr(e.target.value)} placeholder="Aankomst" className="text-xs h-8" />
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs h-8" />
      </div>
      <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Notitie (optioneel)" className="text-xs h-8" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={() => onSave({
          passengers: passengers.split(",").map(s => s.trim()).filter(Boolean),
          departure_time: dep || null,
          arrival_time: arr || null,
          travel_date: date || null,
          note: note || null,
        })}>Opslaan</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Annuleren</Button>
      </div>
    </div>
  );
}
