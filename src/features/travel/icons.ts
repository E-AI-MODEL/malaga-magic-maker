import {
  Bus,
  Car,
  CalendarDays,
  MapPin,
  Plane,
  Ship,
  Ticket,
  Train,
  UtensilsCrossed,
  Home,
  type LucideIcon,
} from "lucide-react";

/** Lucide-only product iconography for trip item types. No emoji anywhere in product UI. */
const map: Record<string, LucideIcon> = {
  flight: Plane,
  train: Train,
  ferry: Ship,
  stay: Home,
  rental_car: Car,
  transfer: Bus,
  activity: Ticket,
  restaurant: UtensilsCrossed,
  event: CalendarDays,
  ticket: Ticket,
  custom: MapPin,
};

export function travelTypeIcon(value: string): LucideIcon {
  return map[value] || MapPin;
}
