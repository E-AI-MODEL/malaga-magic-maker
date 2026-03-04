import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Vote, User } from "lucide-react";
import { SectionComments } from "@/components/SectionComments";

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

interface Task {
  id: string;
  title: string;
  section: string;
  assigned_to: string | null;
  status: string;
  sort_order: number;
}

interface TaskVote {
  id: string;
  task_id: string;
  user_id: string;
  voted_for_user_id: string;
}

interface Comment {
  id: string;
  user_id: string;
  section: string;
  message: string;
  created_at: string;
}

interface TaskBoardProps {
  profiles: Profile[];
  comments: Comment[];
  onAddComment: (section: string, message: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function TaskBoard({ profiles, comments, onAddComment, onDeleteComment }: TaskBoardProps) {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [votes, setVotes] = useState<TaskVote[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [t, v] = await Promise.all([
        supabase.from("tasks").select("*").order("sort_order"),
        supabase.from("task_votes").select("*"),
      ]);
      setTasks((t.data as any[]) || []);
      setVotes((v.data as any[]) || []);
    };
    fetchData();

    const channel = supabase
      .channel("task-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        supabase.from("tasks").select("*").order("sort_order").then(r => setTasks((r.data as any[]) || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_votes" }, () => {
        supabase.from("task_votes").select("*").then(r => setVotes((r.data as any[]) || []));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVote = async (taskId: string, votedForUserId: string) => {
    if (!user) return;
    const existing = votes.find(v => v.task_id === taskId && v.user_id === user.id);
    if (existing) {
      if (existing.voted_for_user_id === votedForUserId) {
        await supabase.from("task_votes").delete().eq("id", existing.id);
      } else {
        await supabase.from("task_votes").update({ voted_for_user_id: votedForUserId }).eq("id", existing.id);
      }
    } else {
      await supabase.from("task_votes").insert({ task_id: taskId, user_id: user.id, voted_for_user_id: votedForUserId });
    }
  };

  const handleAssign = async (taskId: string, name: string) => {
    await supabase.from("tasks").update({ assigned_to: name || null, status: name ? "assigned" : "open" }).eq("id", taskId);
  };

  const getProfileName = (userId: string) => profiles.find(p => p.id === userId)?.display_name || "?";

  const getVotesForTask = (taskId: string) => votes.filter(v => v.task_id === taskId);

  const getVoteTally = (taskId: string) => {
    const taskVotes = getVotesForTask(taskId);
    const tally: Record<string, { count: number; voters: string[] }> = {};
    taskVotes.forEach(v => {
      const name = getProfileName(v.voted_for_user_id);
      if (!tally[v.voted_for_user_id]) tally[v.voted_for_user_id] = { count: 0, voters: [] };
      tally[v.voted_for_user_id].count++;
      tally[v.voted_for_user_id].voters.push(getProfileName(v.user_id));
    });
    return Object.entries(tally)
      .map(([userId, data]) => ({ userId, name: getProfileName(userId), ...data }))
      .sort((a, b) => b.count - a.count);
  };

  const myVoteFor = (taskId: string) => {
    if (!user) return null;
    return votes.find(v => v.task_id === taskId && v.user_id === user.id)?.voted_for_user_id || null;
  };

  if (tasks.length === 0) return null;

  return (
    <section className="bg-accent/30 border-t border-b border-border px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Vote className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Takenverdeling</p>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Stem wie welke taak op zich neemt</p>

      <div className="space-y-3">
        {tasks.map(task => {
          const tally = getVoteTally(task.id);
          const myVote = myVoteFor(task.id);

          return (
            <Card key={task.id} className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-display font-bold text-sm">{task.title}</p>
                  </div>
                  {task.assigned_to && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {task.assigned_to}
                    </Badge>
                  )}
                </div>

                {/* Vote buttons */}
                {!task.assigned_to && user && (
                  <div className="flex flex-wrap gap-1.5">
                    {profiles.map(p => (
                      <Button
                        key={p.id}
                        size="sm"
                        variant={myVote === p.id ? "default" : "outline"}
                        className="h-7 text-xs px-2.5"
                        onClick={() => handleVote(task.id, p.id)}
                      >
                        <User className="h-3 w-3 mr-1" />
                        {p.display_name}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Vote tally */}
                {tally.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tally.map(t => (
                      <div key={t.userId} className="text-xs text-muted-foreground bg-secondary rounded-md px-2 py-1">
                        <span className="font-semibold text-foreground">{t.name}</span>
                        {" "}<span className="font-bold text-primary">{t.count}×</span>
                        <span className="text-[10px] ml-1">({t.voters.join(", ")})</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin assign */}
                {isAdmin && !task.assigned_to && (
                  <Select onValueChange={(val) => handleAssign(task.id, val)}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Toewijzen aan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.display_name}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Admin unassign */}
                {isAdmin && task.assigned_to && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground" onClick={() => handleAssign(task.id, "")}>
                    Toewijzing opheffen
                  </Button>
                )}

                <SectionComments
                  section={`task-${task.id}`}
                  comments={comments}
                  profiles={profiles}
                  onAdd={onAddComment}
                  onDelete={onDeleteComment}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
