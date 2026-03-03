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

const noopLogEvent = async () => {};

export function useLogEvent() {
  const ctx = useContext(ActivityLogContext);
  if (!ctx) {
    console.warn("useLogEvent called outside ActivityLogProvider – returning no-op");
    return noopLogEvent;
  }
  return ctx.logEvent;
}
