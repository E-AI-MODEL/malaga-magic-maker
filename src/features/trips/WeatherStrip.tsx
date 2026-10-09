import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WEATHER_ICONS, weatherIconKey, type WeatherResult } from "./weather";

function weekday(date: string, timeZone: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "short", timeZone }).replace(".", "");
}

export function WeatherStrip({ tripId, timeZone }: { tripId: string; timeZone: string }) {
  const { data } = useQuery({
    queryKey: ["trip-weather", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<WeatherResult>("trip-weather", { body: { tripId } });
      if (error) return null;
      return data;
    },
    staleTime: 15 * 60_000,
  });
  if (!data || !data.available || data.days.length === 0) return null;

  return (
    <div className="border-b border-border px-5 pb-2 pt-3 sm:px-8">
      <ul className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Weersverwachting">
        {data.days.map((day) => {
          const Icon = WEATHER_ICONS[weatherIconKey(day.symbol_code)];
          return (
            <li key={day.date} className="flex min-w-[58px] flex-col items-center gap-0.5 px-1 py-1">
              <span className="font-ui text-[12px] font-semibold text-muted-foreground">{weekday(day.date, timeZone)}</span>
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              <span className="num text-[13px] font-semibold">
                {day.max_c ?? "–"}° <span className="font-normal text-muted-foreground">{day.min_c ?? "–"}°</span>
              </span>
              {day.precipitation_mm >= 1 && <span className="num text-[11px] text-muted-foreground">{Math.round(day.precipitation_mm)} mm</span>}
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[11px] text-muted-foreground">Weer: MET Norway (CC BY 4.0) · Locatie: © OpenStreetMap</p>
    </div>
  );
}
