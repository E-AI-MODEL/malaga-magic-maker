import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { getTripConfig, type TripConfig, type POICategoryDef } from "@/lib/tripConfig";

interface Props {
  tripType?: string;
  /** Optional: highlight locations matching accommodations */
  accommodationLocations?: string[];
}

function colorForMinutes(minutes: number, thresholds: [number, number]): string {
  if (minutes <= thresholds[0]) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (minutes <= thresholds[1]) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

function POICategoryMatrix({ category, locations }: { category: POICategoryDef; locations: string[] }) {
  if (category.pois.length === 0 || locations.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        {category.emoji} {category.label} — Reistijden (min)
      </p>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground sticky left-0 bg-secondary min-w-[140px]">
                {category.label}
              </th>
              {locations.map((loc) => (
                <th key={loc} className="text-center px-2 py-2 font-semibold text-muted-foreground min-w-[80px]">
                  {loc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {category.pois.map((poi) => (
              <tr key={poi.name} className="border-t border-border/40">
                <td className="px-3 py-2 font-medium sticky left-0 bg-background">
                  <div className="flex items-center gap-1.5">
                    <span>{poi.name}</span>
                    {poi.url && (
                      <a href={poi.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline shrink-0">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {poi.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{poi.description}</p>
                  )}
                </td>
                {locations.map((loc) => {
                  const minutes = poi.travelTimes[loc];
                  if (minutes == null) {
                    return <td key={loc} className="text-center px-2 py-2 text-muted-foreground">—</td>;
                  }
                  return (
                    <td key={loc} className="text-center px-2 py-2">
                      <span className={`inline-block rounded-md px-2 py-0.5 font-bold tabular-nums ${colorForMinutes(minutes, category.colorThresholds)}`}>
                        {minutes}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/40" /> ≤{category.colorThresholds[0]} min
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40" /> ≤{category.colorThresholds[1]} min
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-100 dark:bg-red-900/40" /> &gt;{category.colorThresholds[1]} min
        </span>
      </div>
    </div>
  );
}

export function POIMatrix({ tripType, accommodationLocations }: Props) {
  const config = useMemo(() => getTripConfig(tripType), [tripType]);

  // Collect all unique location labels from POI travelTimes
  const locations = useMemo(() => {
    const allLocs = new Set<string>();
    config.poiCategories.forEach((cat) => {
      cat.pois.forEach((poi) => {
        Object.keys(poi.travelTimes).forEach((loc) => allLocs.add(loc));
      });
    });
    // If accommodation locations provided, filter to those; otherwise show all
    if (accommodationLocations && accommodationLocations.length > 0) {
      return accommodationLocations.filter((loc) => allLocs.has(loc));
    }
    return Array.from(allLocs).sort();
  }, [config, accommodationLocations]);

  if (config.poiCategories.length === 0) return null;

  return (
    <div className="space-y-6">
      {config.poiCategories.map((category) => (
        <POICategoryMatrix key={category.key} category={category} locations={locations} />
      ))}
    </div>
  );
}
