import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription
} from "@/components/ui/drawer";
import {
  ChevronRight, Pencil, Save, Plus, Trash2, Link2, X,
  Vote, Upload, Image as ImageIcon, Calendar, Clock, MapPin
} from "lucide-react";
import type { Task, InfoDetails, Profile } from "./types";
import { SECTION_CONTEXT } from "./types";

interface TaskDrawerProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  profiles: Profile[];
  isAdmin: boolean;
  uploading: boolean;
  onImageUpload: (taskId: string, files: FileList) => void;
  onRemoveImage: (taskId: string, url: string) => void;
  onOpenLightbox: (url: string) => void;
}

export function TaskDrawer({
  task, open, onClose, profiles, isAdmin, uploading,
  onImageUpload, onRemoveImage, onOpenLightbox,
}: TaskDrawerProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [editingDetails, setEditingDetails] = useState(false);

  if (!task) return null;

  const details: InfoDetails = (task.info_details as any) || {};
  const canEdit = isAdmin || task.assigned_to === profile?.display_name || task.backup_to === profile?.display_name;

  const handleProgressChange = async (value: number) => {
    await supabase.from("tasks").update({ progress: value }).eq("id", task.id);
  };

  const handleToggleVoting = async (closed: boolean) => {
    await supabase.from("tasks").update({ voting_closed: closed }).eq("id", task.id);
    toast.success(closed ? "Stemming gesloten" : "Stemming geopend");
  };

  const handleDetailsSave = async (newDetails: InfoDetails, infoText: string) => {
    await supabase.from("tasks").update({
      info_details: newDetails as any,
      info_text: infoText || null,
    }).eq("id", task.id);
    setEditingDetails(false);
  };

  const handleAssign = async (field: "assigned_to" | "backup_to", value: string) => {
    await supabase.from("tasks").update({ [field]: value || null }).eq("id", task.id);
  };

  const handleDeleteTask = async () => {
    if (!confirm(`Weet je zeker dat je "${task.title}" wilt verwijderen?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) toast.error("Kon taak niet verwijderen");
    else { toast.success("Taak verwijderd"); onClose(); }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) { onClose(); setEditingDetails(false); } }}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="font-display text-base">{task.title}</DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground">Beheer voortgang, details en instellingen</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-5 overflow-y-auto">

          {/* Context link */}
          {SECTION_CONTEXT[task.section] && (
            <button
              onClick={() => { onClose(); navigate(`/taken/${task.section}`); }}
              className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
            >
              {SECTION_CONTEXT[task.section]} <ChevronRight className="h-3 w-3" />
            </button>
          )}

          {/* Progress */}
          {canEdit && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Voortgang</label>
              <div className="flex gap-1.5">
                {[0, 25, 50, 75, 100].map(step => (
                  <button
                    key={step}
                    onClick={() => handleProgressChange(step)}
                    className={`flex-1 h-8 rounded-md text-xs font-semibold transition-colors ${
                      task.progress >= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {step}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Voting toggle */}
          {canEdit && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="h-3.5 w-3.5 text-muted-foreground" />
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stemming</label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{task.voting_closed ? "Gesloten" : "Open"}</span>
                  <Switch checked={!task.voting_closed} onCheckedChange={(checked) => handleToggleVoting(!checked)} />
                </div>
              </div>
            </div>
          )}

          {/* Details editor */}
          {canEdit && (
            editingDetails ? (
              <TaskDetailsEditor details={details} infoText={task.info_text || ""} onSave={handleDetailsSave} />
            ) : (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 w-full" onClick={() => setEditingDetails(true)}>
                <Pencil className="h-3 w-3" />Details bewerken
              </Button>
            )
          )}

          {/* Photos */}
          {canEdit && (
            <div className="bg-secondary/50 rounded-lg p-3 space-y-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Foto's & bestanden ({task.info_image_urls.length})
                </div>
              </label>
              {task.info_image_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {task.info_image_urls.map((url, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                      <img src={url} alt="" className="w-full h-20 object-cover cursor-pointer" onClick={() => onOpenLightbox(url)} />
                      <button
                        onClick={() => onRemoveImage(task.id, url)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="inline-flex items-center gap-2 text-xs bg-primary/10 text-primary rounded-lg px-3 py-2 cursor-pointer hover:bg-primary/20 transition-colors w-full justify-center font-medium">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploaden..." : "Foto's / bestanden uploaden"}
                <input type="file" accept="image/*,.pdf,.doc,.docx" multiple className="hidden"
                  onChange={(e) => e.target.files && e.target.files.length > 0 && onImageUpload(task.id, e.target.files)}
                  disabled={uploading} />
              </label>
            </div>
          )}

          {/* Admin section */}
          {isAdmin && (
            <div className="space-y-3 pt-3 border-t border-border/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Eigenaar</label>
                  <Select value={task.assigned_to || ""} onValueChange={(v) => handleAssign("assigned_to", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kies..." /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => <SelectItem key={p.id} value={p.display_name}>{p.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Backup</label>
                  <Select value={task.backup_to || ""} onValueChange={(v) => handleAssign("backup_to", v)}>
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
                  <Input type="number" placeholder="0" className="h-8 text-xs" defaultValue={task.cost ?? ""}
                    onBlur={e => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      supabase.from("tasks").update({ cost: val } as any).eq("id", task.id);
                    }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Betaald door</label>
                  <Select value={task.paid_by || ""} onValueChange={v => { supabase.from("tasks").update({ paid_by: v || null } as any).eq("id", task.id); }}>
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
                    const splitAmong: string[] = task.cost_split_among || [];
                    const allShare = splitAmong.length === 0;
                    const isSelected = allShare || splitAmong.includes(p.display_name);
                    return (
                      <button key={p.id}
                        className={`h-7 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                          isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
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
                          supabase.from("tasks").update({ cost_split_among: newSplit.length > 0 ? newSplit : null } as any).eq("id", task.id);
                        }}
                      >
                        {p.display_name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">
                  {(task.cost_split_among || []).length === 0 ? "Iedereen deelt mee" : `${(task.cost_split_among || []).length} personen`}
                </p>
              </div>
              <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDeleteTask}>
                <Trash2 className="h-3 w-3" />Taak verwijderen
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ── Details editor ── */
function TaskDetailsEditor({ details, infoText, onSave }: {
  details: InfoDetails; infoText: string;
  onSave: (details: InfoDetails, infoText: string) => void;
}) {
  const existingUrls = details.urls || (details.url ? [details.url] : []);
  const [urls, setUrls] = useState<string[]>(existingUrls.length > 0 ? existingUrls : [""]);
  const [date, setDate] = useState(details.activity_date || "");
  const [time, setTime] = useState(details.activity_time || "");
  const [location, setLocation] = useState(details.location || "");
  const [notes, setNotes] = useState(infoText);

  const addUrlField = () => setUrls([...urls, ""]);
  const updateUrl = (i: number, v: string) => { const n = [...urls]; n[i] = v; setUrls(n); };
  const removeUrl = (i: number) => { const n = urls.filter((_, idx) => idx !== i); setUrls(n.length > 0 ? n : [""]); };

  const save = () => {
    const cleanUrls = urls.filter(u => u.trim());
    onSave({ url: cleanUrls[0] || undefined, urls: cleanUrls.length > 0 ? cleanUrls : undefined, activity_date: date || undefined, activity_time: time || undefined, location: location || undefined }, notes);
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Details bewerken</label>
      <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Links</label>
          <button onClick={addUrlField} className="text-[10px] text-primary font-medium hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" />Link toevoegen
          </button>
        </div>
        {urls.map((url, i) => (
          <div key={i} className="flex gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Link2 className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input value={url} onChange={e => updateUrl(i, e.target.value)} placeholder="https://..." className="text-xs h-8 pl-8 w-full" />
            </div>
            {urls.length > 1 && (
              <button onClick={() => removeUrl(i)} className="text-muted-foreground hover:text-destructive p-1"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
        ))}
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
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notities..." className="text-xs min-h-[48px]" />
      </div>
      <Button size="sm" className="h-8 text-xs gap-1.5 w-full" onClick={save}>
        <Save className="h-3 w-3" />Opslaan
      </Button>
    </div>
  );
}
