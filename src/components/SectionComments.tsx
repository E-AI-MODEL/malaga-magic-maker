import { useState } from "react";
import { useAuth } from "@/lib/auth";
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
}

export function SectionComments({ section, comments, profiles, onAdd, onDelete }: SectionCommentsProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const sectionComments = comments
    .filter(c => c.section === section)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const getProfileName = (userId: string) => profiles.find(p => p.id === userId)?.display_name || "?";

  const handleSubmit = () => {
    if (!message.trim()) return;
    onAdd(section, message.trim());
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
            <p className="text-muted-foreground">{c.message}</p>
          </div>
        ))}

        {user && (
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Schrijf een reactie..."
              className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs border-0 outline-none placeholder:text-muted-foreground/60"
            />
            <Button size="sm" className="h-8 px-2.5" onClick={handleSubmit} disabled={!message.trim()}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
