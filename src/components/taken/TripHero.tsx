import { useTrip } from "@/contexts/TripContext";
import { toast } from "sonner";
import type { Task } from "./types";

interface TripHeroProps {
  tasks: Task[];
}

export function TripHero({ tasks }: TripHeroProps) {
  const { activeTrip, isOrganizer } = useTrip();
  const trip = activeTrip;
  const now = new Date();
  const start = trip ? new Date(trip.start_date) : now;
  const diffMs = start.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.progress === 100).length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <section className="bg-foreground text-white px-6 py-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-1">
            {trip ? `${new Date(trip.start_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} – ${new Date(trip.end_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}` : ""}
          </p>
          <h1 className="font-display text-2xl font-extrabold">{trip?.name || "Takenverdeling"}</h1>
        </div>
        {daysLeft > 0 && (
          <div className="text-right">
            <p className="font-display text-3xl font-extrabold text-primary">{daysLeft}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/40">dagen</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="font-display text-lg font-bold">{progressPct}%</p>
          <p className="text-[10px] text-white/50 uppercase tracking-wider">Voortgang</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="font-display text-lg font-bold">{doneTasks}/{totalTasks}</p>
          <p className="text-[10px] text-white/50 uppercase tracking-wider">Taken klaar</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="font-display text-lg font-bold">{trip?.group_size || "–"}</p>
          <p className="text-[10px] text-white/50 uppercase tracking-wider">Deelnemers</p>
        </div>
      </div>

      {isOrganizer && trip?.invite_code && (
        <div className="mt-3 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Code:</span>
          <span className="font-mono text-xs text-primary font-bold tracking-wider">{trip.invite_code}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(trip.invite_code || ""); toast("Gekopieerd!"); }}
            className="ml-auto text-[10px] text-white/40 hover:text-white transition-colors"
          >
            Kopieer
          </button>
        </div>
      )}
    </section>
  );
}
