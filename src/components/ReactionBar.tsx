import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Profile {
  id: string;
  display_name: string;
}

interface Reaction {
  id: string;
  user_id: string;
  section: string;
  emoji: string;
}

interface ReactionBarProps {
  section: string;
  reactions: Reaction[];
  profiles: Profile[];
  onToggle: (section: string, emoji: string) => void;
}

const EMOJIS = ["👍", "🔥", "❤️", "😂"];

export function ReactionBar({ section, reactions, profiles, onToggle }: ReactionBarProps) {
  const { user } = useAuth();

  const sectionReactions = reactions.filter(r => r.section === section);

  const getProfileName = (userId: string) => profiles.find(p => p.id === userId)?.display_name || "?";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-1.5 mt-3">
        {EMOJIS.map(emoji => {
          const emojiReactions = sectionReactions.filter(r => r.emoji === emoji);
          const count = emojiReactions.length;
          const isMine = user ? emojiReactions.some(r => r.user_id === user.id) : false;
          const names = emojiReactions.map(r => getProfileName(r.user_id));

          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <Button
                  variant={isMine ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs px-2 gap-1 ${isMine ? "" : "text-muted-foreground"}`}
                  onClick={() => onToggle(section, emoji)}
                  disabled={!user}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span className="font-bold tabular-nums">{count}</span>}
                </Button>
              </TooltipTrigger>
              {names.length > 0 && (
                <TooltipContent side="top" className="text-xs">
                  {names.join(", ")}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
