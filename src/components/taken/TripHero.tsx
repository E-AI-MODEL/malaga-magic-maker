import { useTrip } from "@/contexts/TripContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Task } from "./types";

interface TripHeroProps {
  tasks: Task[];
}

const statVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.2 + i * 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

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
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-1">
            {trip ? `${new Date(trip.start_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} – ${new Date(trip.end_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}` : ""}
          </p>
          <h1 className="font-display text-2xl font-extrabold">{trip?.name || "Takenverdeling"}</h1>
        </motion.div>
        {daysLeft > 0 && (
          <motion.div
            className="text-right"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
          >
            <p className="font-display text-3xl font-extrabold text-primary">{daysLeft}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/40">dagen</p>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { value: `${progressPct}%`, label: "Voortgang" },
          { value: `${doneTasks}/${totalTasks}`, label: "Taken klaar" },
          { value: trip?.group_size || "–", label: "Deelnemers" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={statVariants}
            initial="hidden"
            animate="visible"
            className="bg-white/5 rounded-xl p-3 text-center"
          >
            <p className="font-display text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

    </section>
  );
}
