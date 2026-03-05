import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, Send, Trash2, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface Profile {
  id: string;
  display_name: string;
}

interface Comment {
  id: string;
  user_id: string;
  section: string;
  message: string;
  created_at: string;
}

interface SectionCommentsProps {
  section: string;
  comments: Comment[];
  profiles: Profile[];
  onAdd: (section: string, message: string) => void;
  onDelete: (commentId: string) => void;
  taskId?: string;
  taskTitle?: string;
}

function renderMessageWithMentions(message: string) {
  const parts = message.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-bold text-primary">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function SectionComments({ section, comments, profiles, onAdd, onDelete, taskId, taskTitle }: SectionCommentsProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sectionComments = comments
    .filter(c => c.section === section)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const getProfileName = (userId: string) => profiles.find(p => p.id === userId)?.display_name || "?";

  const filteredProfiles = profiles.filter(p =>
    p.display_name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const handleInputChange = (val: string) => {
    setMessage(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(" ") && afterAt.length < 20) {
        setShowMentions(true);
        setMentionFilter(afterAt);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (name: string) => {
    const lastAt = message.lastIndexOf("@");
    const newMsg = message.slice(0, lastAt) + `@${name} `;
    setMessage(newMsg);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    onAdd(section, message.trim());

    // Find @mentioned users and create notifications
    const mentions = message.match(/@(\w+)/g);
    if (mentions && taskId) {
      for (const mention of mentions) {
        const name = mention.slice(1);
        const mentionedProfile = profiles.find(p =>
          p.display_name.toLowerCase() === name.toLowerCase()
        );
        if (mentionedProfile && mentionedProfile.id !== user.id) {
          const senderName = profiles.find(p => p.id === user.id)?.display_name || "Iemand";
          await supabase.from("notifications").insert({
            user_id: mentionedProfile.id,
            from_user_id: user.id,
            task_id: taskId,
            message: `${senderName} heeft je genoemd in "${taskTitle || "een taak"}"`,
          } as any);
        }
      }
    }

    setMessage("");
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
        <MessageSquare className="h-3 w-3" />
        <span>{sectionComments.length > 0 ? `${sectionComments.length} reactie${sectionComments.length !== 1 ? "s" : ""}` : "Reageer"}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {sectionComments.map(c => (
          <div key={c.id} className="bg-secondary rounded-lg p-2.5 text-xs group">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-semibold">{getProfileName(c.user_id)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[10px]">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: nl })}
                </span>
                {user?.id === c.user_id && (
                  <button
                    onClick={() => onDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-muted-foreground">{renderMessageWithMentions(c.message)}</p>
          </div>
        ))}

        {user && (
          <div className="relative">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Schrijf een reactie... (@naam om te taggen)"
                className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs border-0 outline-none placeholder:text-muted-foreground/60"
              />
              <Button size="sm" className="h-8 px-2.5" onClick={handleSubmit} disabled={!message.trim()}>
                <Send className="h-3 w-3" />
              </Button>
            </div>
            {showMentions && filteredProfiles.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-lg z-50 w-48 max-h-32 overflow-y-auto">
                {filteredProfiles.map(p => (
                  <button
                    key={p.id}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                    onClick={() => insertMention(p.display_name)}
                  >
                    {p.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
