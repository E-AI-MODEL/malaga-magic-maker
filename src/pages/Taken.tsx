import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Plus } from "lucide-react";
import { HeroSkeleton, CardSkeleton, PageTransition } from "@/components/PageSkeleton";

import { TripHero } from "@/components/taken/TripHero";
import { FlightSection } from "@/components/taken/FlightSection";
import { TaskCard } from "@/components/taken/TaskCard";
import { TaskDrawer } from "@/components/taken/TaskDrawer";
import { ALL_SECTIONS, SECTION_LABELS } from "@/components/taken/types";
import type { Task, TravelLeg, Profile, Reaction, Comment, TaskVote } from "@/components/taken/types";

export default function Taken() {
  const { user, profile, isAdmin } = useAuth();
  const { activeTrip } = useTrip();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [travelLegs, setTravelLegs] = useState<TravelLeg[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [taskVotes, setTaskVotes] = useState<TaskVote[]>([]);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tripId = activeTrip?.id;

  useEffect(() => {
    if (!tripId) return;
    const load = async () => {
      setLoading(true);
      const [t, tl, p, r, c, tv] = await Promise.all([
        supabase.from("tasks").select("*").eq("trip_id", tripId).order("sort_order"),
        supabase.from("travel_legs").select("*").eq("trip_id", tripId).order("sort_order"),
        supabase.from("profiles").select("*"),
        supabase.from("reactions").select("*").eq("trip_id", tripId),
        supabase.from("comments").select("*").eq("trip_id", tripId),
        supabase.from("task_votes").select("*"),
      ]);
      setTasks((t.data as any[]) || []);
      setTravelLegs((tl.data as any[]) || []);
      setProfiles((p.data as any[]) || []);
      setReactions((r.data as any[]) || []);
      setComments((c.data as any[]) || []);
      setTaskVotes((tv.data as any[]) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("taken-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        supabase.from("tasks").select("*").eq("trip_id", tripId).order("sort_order").then(r => setTasks((r.data as any[]) || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "travel_legs" }, () => {
        supabase.from("travel_legs").select("*").eq("trip_id", tripId).order("sort_order").then(r => setTravelLegs((r.data as any[]) || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => {
        supabase.from("reactions").select("*").eq("trip_id", tripId).then(r => setReactions((r.data as any[]) || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        supabase.from("comments").select("*").eq("trip_id", tripId).then(r => setComments((r.data as any[]) || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_votes" }, () => {
        supabase.from("task_votes").select("*").then(r => setTaskVotes((r.data as any[]) || []));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

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
              await supabase.from("notifications").update({ read: true } as any).eq("user_id", user.id).eq("read", false);
            },
          },
          duration: 8000,
        });
      }
    };
    checkNotifications();
  }, [user]);

  const handleToggleReaction = useCallback(async (section: string, emoji: string) => {
    if (!user || !tripId) return;
    const existing = reactions.find(r => r.user_id === user.id && r.section === section && r.emoji === emoji);
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({ user_id: user.id, section, emoji, trip_id: tripId });
    }
  }, [user, reactions, tripId]);

  const handleAddComment = useCallback(async (section: string, message: string) => {
    if (!user || !tripId) return;
    await supabase.from("comments").insert({ user_id: user.id, section, message, trip_id: tripId });
  }, [user, tripId]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
  }, []);

  const handleVote = useCallback(async (taskId: string, votedForUserId: string) => {
    if (!user) return;
    const existing = taskVotes.find(v => v.task_id === taskId && v.user_id === user.id);
    if (existing) {
      if (existing.voted_for_user_id === votedForUserId) {
        // Remove vote
        await supabase.from("task_votes").delete().eq("id", existing.id);
      } else {
        // Change vote
        await supabase.from("task_votes").update({ voted_for_user_id: votedForUserId }).eq("id", existing.id);
      }
    } else {
      await supabase.from("task_votes").insert({ task_id: taskId, user_id: user.id, voted_for_user_id: votedForUserId });
    }
  }, [user, taskVotes]);

  const canEditTask = (task: Task) => {
    if (isAdmin) return true;
    if (!profile) return false;
    return task.assigned_to === profile.display_name || task.backup_to === profile.display_name;
  };

  const handleImageUpload = async (taskId: string, files: FileList) => {
    setUploading(true);
    const task = tasks.find(t => t.id === taskId);
    const currentUrls = [...(task?.info_image_urls || [])];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("task-attachments").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("task-attachments").getPublicUrl(path);
        currentUrls.push(urlData.publicUrl);
      }
    }
    await supabase.from("tasks").update({ info_image_urls: currentUrls }).eq("id", taskId);
    setUploading(false);
    if (files.length > 1) toast.success(`${files.length} bestanden geüpload`);
  };

  const handleRemoveImage = async (taskId: string, url: string) => {
    const task = tasks.find(t => t.id === taskId);
    const urls = (task?.info_image_urls || []).filter(u => u !== url);
    await supabase.from("tasks").update({ info_image_urls: urls }).eq("id", taskId);
  };

  const handleLegUpdate = async (legId: string, updates: Partial<TravelLeg>) => {
    await supabase.from("travel_legs").update(updates).eq("id", legId);
  };

  const handleAddTask = async (section: string) => {
    if (!newTaskTitle.trim() || !tripId) return;
    const maxSort = tasks.filter(t => t.section === section).reduce((m, t) => Math.max(m, t.sort_order), 0);
    const { error } = await supabase.from("tasks").insert({ title: newTaskTitle.trim(), section, sort_order: maxSort + 1, trip_id: tripId });
    if (error) toast.error("Kon taak niet toevoegen");
    else { toast.success("Taak toegevoegd"); setNewTaskTitle(""); setAddingToSection(null); }
  };

  const existingSections = [...new Set(tasks.map(t => t.section))];
  const allSections = ALL_SECTIONS.filter(s => existingSections.includes(s) || isAdmin);
  existingSections.forEach(s => { if (!allSections.includes(s)) allSections.push(s); });

  const drawerTask = tasks.find(t => t.id === drawerTaskId) || null;

  if (loading) {
    return (
      <AppLayout>
        <div>
          <HeroSkeleton />
          <div className="px-6 py-6 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTransition>
        <TripHero tasks={tasks} />
        <FlightSection travelLegs={travelLegs} isAdmin={isAdmin} onLegUpdate={handleLegUpdate} />

        {/* Tasks */}
        <section className="px-6 py-6 pb-24">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Taken</p>
          </div>

          <Accordion type="multiple" defaultValue={[]} className="space-y-4">
            {allSections.map(section => {
              const sectionTasks = tasks.filter(t => t.section === section);
              const avgProgress = sectionTasks.length > 0
                ? Math.round(sectionTasks.reduce((a, t) => a + t.progress, 0) / sectionTasks.length)
                : 0;
              const doneTasks = sectionTasks.filter(t => t.progress === 100).length;
              const inProgressTasks = sectionTasks.filter(t => t.progress > 0 && t.progress < 100).length;

              return (
                <AccordionItem key={section} value={section} className="border rounded-lg border-border/60 overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                    <div className="flex items-center gap-3 w-full pr-2">
                      <div className="flex-1 text-left">
                        <span className="font-display font-bold text-sm">{SECTION_LABELS[section] || section}</span>
                        {sectionTasks.length > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${avgProgress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{avgProgress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {doneTasks > 0 && (
                          <Badge className="bg-primary/10 text-primary border-0 text-[10px] tabular-nums px-1.5">
                            {doneTasks} klaar
                          </Badge>
                        )}
                        {inProgressTasks > 0 && (
                          <Badge className="bg-warning/10 text-warning border-0 text-[10px] tabular-nums px-1.5">
                            {inProgressTasks} bezig
                          </Badge>
                        )}
                        {sectionTasks.length === 0 && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Leeg</Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    <div className="space-y-3 px-4 pb-4">
                      {sectionTasks.map((task, idx) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isOpen={openTask === task.id}
                          onToggle={(o) => setOpenTask(o ? task.id : null)}
                          editable={canEditTask(task)}
                          profiles={profiles}
                          reactions={reactions}
                          comments={comments}
                          votes={taskVotes}
                          currentUserId={user?.id}
                          onToggleReaction={handleToggleReaction}
                          onAddComment={handleAddComment}
                          onDeleteComment={handleDeleteComment}
                          onVote={handleVote}
                          onOpenDrawer={setDrawerTaskId}
                          onOpenLightbox={setLightboxUrl}
                          index={idx}
                        />
                      ))}

                      {isAdmin && (
                        <div className="pt-2">
                          {addingToSection === section ? (
                            <div className="flex gap-2">
                              <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                                placeholder="Taaknaam..." className="text-xs h-8 flex-1"
                                onKeyDown={e => e.key === "Enter" && handleAddTask(section)} autoFocus />
                              <Button size="sm" className="h-8 text-xs" onClick={() => handleAddTask(section)}>
                                <Plus className="h-3 w-3 mr-1" />Toevoegen
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingToSection(null); setNewTaskTitle(""); }}>
                                Annuleer
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 w-full border-dashed"
                              onClick={() => setAddingToSection(section)}>
                              <Plus className="h-3 w-3" />Taak toevoegen
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

        {/* Task Drawer */}
        <TaskDrawer
          task={drawerTask}
          open={!!drawerTaskId}
          onClose={() => setDrawerTaskId(null)}
          profiles={profiles}
          isAdmin={isAdmin}
          uploading={uploading}
          onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage}
          onOpenLightbox={setLightboxUrl}
        />

        {/* Lightbox */}
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 border-border">
            {lightboxUrl && <img src={lightboxUrl} alt="" className="w-full h-full object-contain rounded-lg" />}
          </DialogContent>
        </Dialog>
    </AppLayout>
  );
}
