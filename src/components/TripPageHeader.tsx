import { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTripDateRange } from "@/features/trips/presentation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Shared top line for trip work screens: dates and destination, with one outline add action. */
export function TripPageHeader({
  startDate,
  endDate,
  destination,
  addActions,
  addMenu,
}: {
  startDate: string | null;
  endDate: string | null;
  destination?: string | null;
  addActions?: Array<{ label: string; onClick: () => void }>;
  addMenu?: ReactNode;
}) {
  const hasMenu = Boolean(addMenu) || Boolean(addActions?.length);
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <p className="min-w-0 text-sm leading-snug text-muted-foreground">
        {formatTripDateRange(startDate, endDate)}
        {destination ? ` · ${destination}` : ""}
      </p>
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="shrink-0 rounded-md">
              <Plus className="mr-1.5 h-3.5 w-3.5" />Toevoegen
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {addMenu ?? addActions?.map((action) => (
              <DropdownMenuItem key={action.label} onClick={action.onClick}>{action.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
