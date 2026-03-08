import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ReactionBar } from "@/components/ReactionBar";
import { SectionComments } from "@/components/SectionComments";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, User, Shield, Vote, Settings2, Link2, Calendar, Clock, MapPin
} from "lucide-react";
import type { Task, InfoDetails, Profile, Reaction, Comment } from "./types";

interface TaskCardProps {
  task: Task;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  editable: boolean;
  profiles: Profile[];
  reactions: Reaction[];
  comments: Comment[];
  onToggleReaction: (section: string, emoji: string) => void;
  onAddComment: (section: string, message: string) => void;
  onDeleteComment: (commentId: string) => void;
  onOpenDrawer: (taskId: string) => void;
  onOpenLightbox: (url: string) => void;
}

export function TaskCard({
  task, isOpen, onToggle, editable, profiles, reactions, comments,
  onToggleReaction, onAddComment, onDeleteComment, onOpenDrawer, onOpenLightbox,
}: TaskCardProps) {
  const details: InfoDetails = (task.info_details as any) || {};

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
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
              {!task.voting_closed && (
                <Badge className="bg-accent text-accent-foreground text-[10px]">
                  <Vote className="h-3 w-3 mr-1" />Stemming open
                </Badge>
              )}
            </div>
            <Progress value={task.progress} className="h-2 rounded-full" />
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
            <TaskDetailsReadonly details={details} infoText={task.info_text} />

            {task.info_image_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {task.info_image_urls.map((url, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border border-border cursor-pointer"
                    onClick={() => onOpenLightbox(url)}>
                    <img src={url} alt="" className="w-full h-24 object-cover" />
                  </div>
                ))}
              </div>
            )}

            {editable && (
              <div className="pt-2 border-t border-border/40">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => onOpenDrawer(task.id)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  Beheren
                </Button>
              </div>
            )}

            <div className="pt-3 border-t border-border/40 space-y-2">
              <ReactionBar section={`task-${task.id}`} reactions={reactions} profiles={profiles} onToggle={onToggleReaction} />
              <SectionComments
                section={`task-${task.id}`}
                comments={comments}
                profiles={profiles}
                onAdd={onAddComment}
                onDelete={onDeleteComment}
                taskId={task.id}
                taskTitle={task.title}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function TaskDetailsReadonly({ details, infoText }: { details: InfoDetails; infoText: string | null }) {
  const allUrls = details.urls || (details.url ? [details.url] : []);
  const hasAny = allUrls.length > 0 || details.activity_date || details.activity_time || details.location || infoText;
  if (!hasAny) return null;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
      {allUrls.map((url, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{url}</a>
        </div>
      ))}
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
