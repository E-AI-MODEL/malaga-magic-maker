import { createContext, useContext, ReactNode } from "react";
import { useActivityLog } from "@/hooks/useActivityLog";

interface ActivityLogContextType {
  logEvent: (eventType: string, page: string, detail?: string) => Promise<void>;
}

const ActivityLogContext = createContext<ActivityLogContextType | null>(null);

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const { logEvent } = useActivityLog();
  return (
    <ActivityLogContext.Provider value={{ logEvent }}>
      {children}
    </ActivityLogContext.Provider>
  );
}

export function useLogEvent() {
  const ctx = useContext(ActivityLogContext);
  if (!ctx) throw new Error("useLogEvent must be used within ActivityLogProvider");
  return ctx.logEvent;
}
