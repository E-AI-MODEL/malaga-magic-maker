import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { usePOIData, type POICategory } from "@/hooks/usePOIData";
import { getTripConfig, type POICategoryDef } from "@/lib/tripConfig";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  tripType?: string;
  accommodationLocations?: string[];
}

function colorForMinutes(minutes: number, good: number, ok: number): string {
  if (minutes <= good) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (minutes <= ok) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

interface MatrixData {
  label: string;
  emoji: string;
  good: number;
  ok: number;
  pois: { name: string; url?: string | null; description?: string | null; travelTimes: Record<string, number> }[];
}

function CategoryMatrix({ data, locations }: { data: MatrixData; locations: string[] }) {
  if (data.pois.length === 0 || locations.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        {data.emoji} {data.label} — Reistijden (min)
      </p>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground sticky left-0 bg-secondary min-w-[140px]">
                {data.label}
              </th>
              {locations.map((loc) => (
                <th key={loc} className="text-center px-2 py-2 font-semibold text-muted-foreground min-w-[80px]">{loc}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.pois.map((poi) => (
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
                  {poi.description && <p className="text-[10px] text-muted-foreground mt-0.5">{poi.description}</p>}
                </td>
                {locations.map((loc) => {
                  const minutes = poi.travelTimes[loc];
                  if (minutes == null) {
                    return <td key={loc} className="text-center px-2 py-2 text-muted-foreground">—</td>;
                  }
                  return (
                    <td key={loc} className="text-center px-2 py-2">
                      <span className={`inline-block rounded-md px-2 py-0.5 font-bold tabular-nums ${colorForMinutes(minutes, data.good, data.ok)}`}>
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
          <span className="inline-block w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/40" /> ≤{data.good} min
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40" /> ≤{data.ok} min
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-100 dark:bg-red-900/40" /> &gt;{data.ok} min
        </span>
      </div>
    </div>
  );
}

export function POIMatrix({ tripType, accommodationLocations }: Props) {
  const { categories: dbCategories, loading } = usePOIData();
  const config = useMemo(() => getTripConfig(tripType), [tripType]);

  // Merge: use DB data if available, otherwise fallback to hardcoded config
  const matrixData: MatrixData[] = useMemo(() => {
    if (dbCategories.length > 0) {
      return dbCategories.map((cat) => ({
        label: cat.label,
        emoji: cat.emoji,
        good: cat.color_threshold_good,
        ok: cat.color_threshold_ok,
        pois: cat.pois.map((p) => ({
          name: p.name,
          url: p.url,
          description: p.description,
          travelTimes: p.travel_times,
        })),
      }));
    }
    // Fallback to config
    return config.poiCategories.map((cat) => ({
      label: cat.label,
      emoji: cat.emoji,
      good: cat.colorThresholds[0],
      ok: cat.colorThresholds[1],
      pois: cat.pois.map((p) => ({
        name: p.name,
        url: p.url,
        description: p.description,
        travelTimes: p.travelTimes,
      })),
    }));
  }, [dbCategories, config]);

  const locations = useMemo(() => {
    const allLocs = new Set<string>();
    matrixData.forEach((cat) => {
      cat.pois.forEach((poi) => {
        Object.keys(poi.travelTimes).forEach((loc) => allLocs.add(loc));
      });
    });
    if (accommodationLocations && accommodationLocations.length > 0) {
      return accommodationLocations.filter((loc) => allLocs.has(loc));
    }
    return Array.from(allLocs).sort();
  }, [matrixData, accommodationLocations]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (matrixData.length === 0) return null;

  return (
    <div className="space-y-6">
      {matrixData.map((data) => (
        <CategoryMatrix key={data.label} data={data} locations={locations} />
      ))}
    </div>
  );
}
