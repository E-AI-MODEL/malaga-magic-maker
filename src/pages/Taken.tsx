import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReactionBar } from "@/components/ReactionBar";
import { SectionComments } from "@/components/SectionComments";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Plane, ChevronDown, CheckCircle2, Upload, User, Shield, X,
  Globe, MapPin, Clock, Calendar, Pencil, Save, ChevronRight, Info,
  Plus, Trash2, Settings2
} from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription
} from "@/components/ui/drawer";

interface Profile { id: string; username: string; display_name: string; }
interface InfoDetails {
  url?: string;
  activity_date?: string;
  activity_time?: string;
  location?: string;
}
interface Task {
  id: string; title: string; section: string; assigned_to: string | null;
  backup_to: string | null; status: string; sort_order: number;
  voting_closed: boolean; progress: number; info_text: string | null;
  info_image_urls: string[]; info_details: InfoDetails;
  cost: number | null; paid_by: string | null;
}
interface TravelLeg {
  id: string; passengers: string[]; departure_time: string | null;
  arrival_time: string | null; travel_date: string | null;
  note: string | null; sort_order: number;
}
interface Reaction { id: string; user_id: string; section: string; emoji: string; }
interface Comment { id: string; user_id: string; section: string; message: string; created_at: string; }

const SECTION_CONTEXT: Record<string, string> = {
  transport: "Bekijk context & info",
  accommodatie: "Bekijk context & info",
  golf: "Bekijk context & info",
  strand: "Bekijk context & info",
};

export default function Taken() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [travelLegs, setTravelLegs] = useState<TravelLeg[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingLeg, setEditingLeg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [flightsOpen, setFlightsOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

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

  // Notification check on mount
  useEffect(() => {
    if (!user) return;
    const checkNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("read", false) as any;
      if (data && data.length > 0) {
        toast.info(`Je hebt ${data.length} nieuwe reactie${data.length !== 1 ? "s" : ""} op je taken`, {
          action: {
            label: "Gelezen",
            onClick: async () => {
              await supabase
                .from("notifications")
                .update({ read: true } as any)
                .eq("user_id", user.id)
                .eq("read", false);
            },
          },
          duration: 8000,
        });
      }
    };
    checkNotifications();
  }, [user]);

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

  const handleDetailsSave = async (taskId: string, details: InfoDetails, infoText: string) => {
    await supabase.from("tasks").update({
      info_details: details as any,
      info_text: infoText || null,
    }).eq("id", taskId);
    setEditingTaskId(null);
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

  const handleAddTask = async (section: string) => {
    if (!newTaskTitle.trim()) return;
    const maxSort = tasks.filter(t => t.section === section).reduce((m, t) => Math.max(m, t.sort_order), 0);
    const { error } = await supabase.from("tasks").insert({
      title: newTaskTitle.trim(),
      section,
      sort_order: maxSort + 1,
    });
    if (error) {
      toast.error("Kon taak niet toevoegen");
    } else {
      toast.success("Taak toegevoegd");
      setNewTaskTitle("");
      setAddingToSection(null);
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!confirm(`Weet je zeker dat je "${title}" wilt verwijderen?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      toast.error("Kon taak niet verwijderen");
    } else {
      toast.success("Taak verwijderd");
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
  };

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <section className="bg-foreground text-white px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">Organisatie</p>
              <h1 className="font-display text-2xl font-extrabold">Takenverdeling</h1>
              <p className="text-white/60 text-sm mt-1">Voortgang, vluchtgegevens en taakverdeling</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 px-3 py-2 transition-colors">
                  <Info className="h-4 w-4 text-primary-foreground" />
                  <span className="text-xs font-medium text-primary-foreground whitespace-nowrap">Speciaal voor Edwin wat uitleg</span>
                  <ChevronDown className="h-3 w-3 text-primary-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 text-sm" side="bottom" align="end">
                <p className="font-semibold mb-1.5">Hoe werkt het?</p>
                <ul className="space-y-1.5 text-muted-foreground text-xs">
                  <li>• Elke taak heeft een <strong>eigenaar</strong> en een <strong>backup</strong>.</li>
                  <li>• Alleen de <strong>eigenaar</strong> en <strong>backup</strong> kunnen de contextpagina openen en taakdetails bewerken via de bewerkknop.</li>
                  <li>• Als eigenaar kun je details invullen, foto{"'"}s uploaden en de voortgang bijhouden.</li>
                  <li>• Via <strong>{'"'}Bekijk context & info{'"'}</strong> vind je alle groepswensen, stemmen en handige links om je te helpen.</li>
                  <li>• Pas wanneer je wijzigingen <strong>opslaat</strong>, worden ze zichtbaar voor de rest van de groep.</li>
                  <li>• Andere deelnemers kunnen reageren en commentaar achterlaten.</li>
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* ═══ VLUCHTGEGEVENS (uitklapbaar) ═══ */}
        <Collapsible open={flightsOpen} onOpenChange={setFlightsOpen}>
          <section className="border-b border-border px-6 py-4">
      <CollapsibleTrigger className="flex items-center justify-between w-full bg-secondary/50 rounded-lg px-3 py-2.5 hover:bg-secondary/80 transition-colors">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Vluchtgegevens</p>
              </div>
              <ChevronDown className={`h-5 w-5 text-primary transition-transform ${flightsOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="space-y-2 mt-4">
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
            </CollapsibleContent>
          </section>
        </Collapsible>

        {/* ═══ TAKEN ═══ */}
        <section className="px-6 py-6 pb-24">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Taken</p>
          </div>

          <Accordion type="multiple" defaultValue={[]} className="space-y-4">
            {[...new Set(tasks.map(t => t.section))].map(section => {
              const sectionLabels: Record<string, string> = {
                transport: "Vervoer",
                accommodatie: "Accommodatie",
                golf: "Golf",
                strand: "Strand & omgeving",
              };
              const sectionTasks = tasks.filter(t => t.section === section);

              return (
                <AccordionItem key={section} value={section} className="border rounded-lg border-border/60 overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm">{sectionLabels[section] || section}</span>
                      <Badge variant="outline" className="text-[10px] font-mono tabular-nums border-primary/30 text-primary ml-auto">
                        {Math.round(sectionTasks.reduce((a, t) => a + t.progress, 0) / sectionTasks.length)}%
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    <div className="space-y-3 px-4 pb-4">
                      {sectionTasks.map(task => {
                        const isOpen = openTask === task.id;
                        const editable = canEditTask(task);
                        
                        const contextLabel = SECTION_CONTEXT[task.section];
                        const details: InfoDetails = (task.info_details as any) || {};

                        return (
                          <Collapsible key={task.id} open={isOpen} onOpenChange={(o) => setOpenTask(o ? task.id : null)}>
                            <Card className="border-border/60 overflow-hidden">
                              <CollapsibleTrigger asChild>
                                <CardContent className="p-4 cursor-pointer hover:bg-accent/5 transition-colors">
                                  <div className="flex items-center justify-between gap-2 mb-3">
                                    <p className="font-display font-bold text-sm flex-1">{task.title}</p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-[10px] font-mono tabular-nums border-primary/30 text-primary">
                                        {task.progress}%
                                      </Badge>
                                      <div className="bg-primary/10 rounded-full p-1.5">
                                        <ChevronDown className={`h-4 w-4 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mb-3">
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
                                    {task.cost != null && task.cost > 0 && (
                                      <Badge variant="secondary" className="text-[10px] tabular-nums">
                                        €{task.cost.toFixed(0)}
                                        {task.paid_by && <span className="ml-1 text-muted-foreground">· {task.paid_by}</span>}
                                      </Badge>
                                    )}
                                  </div>
                                  <Progress value={task.progress} className="h-2 rounded-full" />
                                </CardContent>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">

                                  {/* Read-only details & photos — visible to everyone */}
                                  <TaskDetailsReadonly details={details} infoText={task.info_text} />

                                  {task.info_image_urls.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                      {task.info_image_urls.map((url, i) => (
                                        <div key={i} className="rounded-lg overflow-hidden border border-border cursor-pointer"
                                          onClick={() => setLightboxUrl(url)}>
                                          <img src={url} alt="" className="w-full h-24 object-cover" />
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Gear icon — only for owner/backup/admin */}
                                  {editable && (
                                    <div className="pt-2 border-t border-border/40">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs gap-1.5"
                                        onClick={() => setDrawerTaskId(task.id)}
                                      >
                                        <Settings2 className="h-3.5 w-3.5" />
                                        Beheren
                                      </Button>
                                    </div>
                                  )}

                                  {/* Reactions & comments — visible to everyone */}
                                  <div className="pt-3 border-t border-border/40 space-y-2">
                                    <ReactionBar section={`task-${task.id}`} reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
                                    <SectionComments
                                      section={`task-${task.id}`}
                                      comments={comments}
                                      profiles={profiles}
                                      onAdd={handleAddComment}
                                      onDelete={handleDeleteComment}
                                      taskId={task.id}
                                      taskTitle={task.title}
                                    />
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        );
                      })}

                      {/* Admin: taak toevoegen */}
                      {isAdmin && (
                        <div className="pt-2">
                          {addingToSection === section ? (
                            <div className="flex gap-2">
                              <Input
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                placeholder="Taaknaam..."
                                className="text-xs h-8 flex-1"
                                onKeyDown={e => e.key === "Enter" && handleAddTask(section)}
                                autoFocus
                              />
                              <Button size="sm" className="h-8 text-xs" onClick={() => handleAddTask(section)}>
                                <Plus className="h-3 w-3 mr-1" />Toevoegen
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingToSection(null); setNewTaskTitle(""); }}>
                                Annuleer
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5 w-full border-dashed"
                              onClick={() => setAddingToSection(section)}
                            >
                              <Plus className="h-3 w-3" />
                              Taak toevoegen
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>

        {/* ═══ TASK EDIT DRAWER ═══ */}
        {(() => {
          const drawerTask = tasks.find(t => t.id === drawerTaskId);
          if (!drawerTask) return null;
          const drawerDetails: InfoDetails = (drawerTask.info_details as any) || {};
          return (
            <Drawer open={!!drawerTaskId} onOpenChange={(open) => { if (!open) { setDrawerTaskId(null); setEditingTaskId(null); } }}>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="pb-2">
                  <DrawerTitle className="font-display text-base">{drawerTask.title}</DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground">Beheer voortgang, details en instellingen</DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-6 space-y-4 overflow-y-auto">
                  {/* Context link */}
                  {SECTION_CONTEXT[drawerTask.section] && (
                    <button
                      onClick={() => { setDrawerTaskId(null); navigate(`/taken/${drawerTask.section}`); }}
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                    >
                      {SECTION_CONTEXT[drawerTask.section]} <ChevronRight className="h-3 w-3" />
                    </button>
                  )}

                  {/* Progress — canEditTask */}
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Voortgang</label>
                    <div className="flex gap-1.5">
                      {[0, 25, 50, 75, 100].map(step => (
                        <button
                          key={step}
                          onClick={() => handleProgressChange(drawerTask.id, [step])}
                          className={`flex-1 h-8 rounded-md text-xs font-semibold transition-colors ${
                            drawerTask.progress >= step
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {step}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details editor — canEditTask */}
                  {editingTaskId === drawerTask.id ? (
                    <TaskDetailsEditor
                      details={drawerDetails}
                      infoText={drawerTask.info_text || ""}
                      onSave={(d, t) => handleDetailsSave(drawerTask.id, d, t)}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 w-full"
                      onClick={() => setEditingTaskId(drawerTask.id)}
                    >
                      <Pencil className="h-3 w-3" />
                      Details bewerken
                    </Button>
                  )}

                  {/* Photo management — canEditTask */}
                  <div>
                    {drawerTask.info_image_urls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {drawerTask.info_image_urls.map((url, i) => (
                          <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                            <img src={url} alt="" className="w-full h-20 object-cover" />
                            <button
                              onClick={() => handleRemoveImage(drawerTask.id, url)}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                      <Upload className="h-3 w-3" />
                      {uploading ? "Uploaden..." : "Foto toevoegen"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(drawerTask.id, e.target.files[0])}
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  {/* Admin-only section */}
                  {isAdmin && (
                    <div className="space-y-3 pt-3 border-t border-border/40">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Eigenaar</label>
                          <Select value={drawerTask.assigned_to || ""} onValueChange={(v) => handleAssign(drawerTask.id, "assigned_to", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kies..." /></SelectTrigger>
                            <SelectContent>
                              {profiles.map(p => <SelectItem key={p.id} value={p.display_name}>{p.display_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Backup</label>
                          <Select value={drawerTask.backup_to || ""} onValueChange={(v) => handleAssign(drawerTask.id, "backup_to", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kies..." /></SelectTrigger>
                            <SelectContent>
                              {profiles.map(p => <SelectItem key={p.id} value={p.display_name}>{p.display_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Kosten (€)</label>
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-8 text-xs"
                            defaultValue={drawerTask.cost ?? ""}
                            onBlur={e => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              supabase.from("tasks").update({ cost: val } as any).eq("id", drawerTask.id).then(() => {});
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Betaald door</label>
                          <Select value={drawerTask.paid_by || ""} onValueChange={v => { supabase.from("tasks").update({ paid_by: v || null } as any).eq("id", drawerTask.id); }}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kies..." /></SelectTrigger>
                            <SelectContent>
                              {profiles.map(p => <SelectItem key={p.id} value={p.display_name}>{p.display_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block">Deelt mee in kosten</label>
                        <div className="flex flex-wrap gap-1.5">
                          {profiles.filter(p => p.username !== "admin" && p.username !== "Admin").map(p => {
                            const splitAmong: string[] = (drawerTask as any).cost_split_among || [];
                            const allShare = splitAmong.length === 0;
                            const isSelected = allShare || splitAmong.includes(p.display_name);
                            return (
                              <button
                                key={p.id}
                                className={`h-7 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                                }`}
                                onClick={() => {
                                  let newSplit: string[];
                                  if (allShare) {
                                    newSplit = profiles.filter(pp => pp.username !== "admin" && pp.username !== "Admin" && pp.display_name !== p.display_name).map(pp => pp.display_name);
                                  } else if (isSelected) {
                                    newSplit = splitAmong.filter(n => n !== p.display_name);
                                  } else {
                                    newSplit = [...splitAmong, p.display_name];
                                  }
                                  const allParticipants = profiles.filter(pp => pp.username !== "admin" && pp.username !== "Admin");
                                  if (newSplit.length >= allParticipants.length) newSplit = [];
                                  supabase.from("tasks").update({ cost_split_among: newSplit.length > 0 ? newSplit : null } as any).eq("id", drawerTask.id);
                                }}
                              >
                                {p.display_name}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1">
                          {((drawerTask as any).cost_split_among || []).length === 0 ? "Iedereen deelt mee" : `${((drawerTask as any).cost_split_among || []).length} personen`}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => { handleDeleteTask(drawerTask.id, drawerTask.title); setDrawerTaskId(null); }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Taak verwijderen
                      </Button>
                    </div>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          );
        })()}

        {/* Lightbox */}
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 border-border">
            {lightboxUrl && (
              <img src={lightboxUrl} alt="" className="w-full h-full object-contain rounded-lg" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

/* ── Structured details editor with Save button ── */
function TaskDetailsEditor({ details, infoText, onSave }: {
  details: InfoDetails;
  infoText: string;
  onSave: (details: InfoDetails, infoText: string) => void;
}) {
  const [url, setUrl] = useState(details.url || "");
  const [date, setDate] = useState(details.activity_date || "");
  const [time, setTime] = useState(details.activity_time || "");
  const [location, setLocation] = useState(details.location || "");
  const [notes, setNotes] = useState(infoText);

  const save = () => {
    onSave(
      { url: url || undefined, activity_date: date || undefined, activity_time: time || undefined, location: location || undefined },
      notes
    );
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-muted-foreground block">Details</label>
      
      <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Link</label>
        <div className="relative">
          <Globe className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link / URL" className="text-xs h-8 pl-8" />
        </div>
      </div>

      <div className="bg-secondary/50 rounded-lg p-3 space-y-2 overflow-hidden">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Datum & tijd</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative min-w-0">
            <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs h-8 pl-8 w-full" />
          </div>
          <div className="relative min-w-0">
            <Clock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="text-xs h-8 pl-8 w-full" />
          </div>
        </div>
      </div>

      <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Locatie</label>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Locatie" className="text-xs h-8 pl-8" />
        </div>
      </div>

      <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notities</label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notities..."
          className="text-xs min-h-[48px]"
        />
      </div>

      <Button size="sm" className="h-8 text-xs gap-1.5 w-full" onClick={save}>
        <Save className="h-3 w-3" />
        Opslaan
      </Button>
    </div>
  );
}

/* ── Structured details read-only (styled card) ── */
function TaskDetailsReadonly({ details, infoText }: { details: InfoDetails; infoText: string | null }) {
  const hasAny = details.url || details.activity_date || details.activity_time || details.location || infoText;
  if (!hasAny) return null;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
      {details.url && (
        <div className="flex items-center gap-2 text-xs">
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
          <a href={details.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{details.url}</a>
        </div>
      )}
      {details.activity_date && (
        <div className="flex items-center gap-2 text-xs text-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{formatDate(details.activity_date)}</span>
        </div>
      )}
      {details.activity_time && (
        <div className="flex items-center gap-2 text-xs text-foreground">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{details.activity_time}</span>
        </div>
      )}
      {details.location && (
        <div className="flex items-center gap-2 text-xs text-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{details.location}</span>
        </div>
      )}
      {infoText && (
        <p className="text-xs text-muted-foreground pt-1.5 border-t border-primary/10">{infoText}</p>
      )}
    </div>
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
