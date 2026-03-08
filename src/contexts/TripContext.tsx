import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Trip {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  cover_image_url: string | null;
  status: string;
  invite_code: string | null;
  start_date: string;
  end_date: string;
  group_size: number;
  golf_min: number;
  golf_max: number;
  flights_note: string;
}

interface TripMember {
  user_id: string;
  role: string;
}

interface CreateTripInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  group_size?: number;
}

interface TripContextType {
  activeTrip: Trip | null;
  userTrips: Trip[];
  tripMembers: TripMember[];
  isOrganizer: boolean;
  loading: boolean;
  switchTrip: (tripId: string) => void;
  createTrip: (data: CreateTripInput) => Promise<Trip | null>;
  joinTrip: (inviteCode: string) => Promise<{ error?: string }>;
  refreshTrips: () => Promise<void>;
}

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setUserTrips([]);
      setActiveTrip(null);
      setLoading(false);
      return;
    }

    // Get all trips where user is a member
    const { data: memberships } = await supabase
      .from("trip_members")
      .select("trip_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setUserTrips([]);
      setActiveTrip(null);
      setLoading(false);
      return;
    }

    const tripIds = memberships.map((m: any) => m.trip_id);
    const { data: trips } = await supabase
      .from("trip")
      .select("*")
      .in("id", tripIds);

    if (trips && trips.length > 0) {
      setUserTrips(trips as Trip[]);

      // Restore last active trip or pick first
      const savedTripId = localStorage.getItem("vakansie_active_trip");
      const saved = trips.find((t: any) => t.id === savedTripId);
      const selected = saved || trips[0];
      setActiveTrip(selected as Trip);

      // Set organizer status
      const membership = memberships.find((m: any) => m.trip_id === selected.id);
      setIsOrganizer(membership?.role === "organizer");

      // Fetch members for active trip
      const { data: members } = await supabase
        .from("trip_members")
        .select("user_id, role")
        .eq("trip_id", selected.id);
      setTripMembers((members as TripMember[]) || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const switchTrip = useCallback(async (tripId: string) => {
    const trip = userTrips.find((t) => t.id === tripId);
    if (trip) {
      setActiveTrip(trip);
      localStorage.setItem("vakansie_active_trip", tripId);

      // Update organizer status
      if (user) {
        const { data: membership } = await supabase
          .from("trip_members")
          .select("role")
          .eq("trip_id", tripId)
          .eq("user_id", user.id)
          .single();
        setIsOrganizer(membership?.role === "organizer");

        const { data: members } = await supabase
          .from("trip_members")
          .select("user_id, role")
          .eq("trip_id", tripId);
        setTripMembers((members as TripMember[]) || []);
      }
    }
  }, [userTrips, user]);

  const createTrip = useCallback(async (data: CreateTripInput): Promise<Trip | null> => {
    if (!user) return null;

    const { data: newTrip, error } = await supabase
      .from("trip")
      .insert({
        name: data.name,
        description: data.description || null,
        start_date: data.start_date,
        end_date: data.end_date,
        group_size: data.group_size || 2,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !newTrip) return null;

    // Add creator as organizer
    await supabase.from("trip_members").insert({
      trip_id: newTrip.id,
      user_id: user.id,
      role: "organizer",
    });

    await fetchTrips();
    switchTrip(newTrip.id);
    return newTrip as Trip;
  }, [user, fetchTrips, switchTrip]);

  const joinTrip = useCallback(async (inviteCode: string): Promise<{ error?: string }> => {
    if (!user) return { error: "Niet ingelogd" };

    const { data: trip } = await supabase
      .from("trip")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (!trip) return { error: "Ongeldige uitnodigingscode" };

    const { error } = await supabase.from("trip_members").insert({
      trip_id: trip.id,
      user_id: user.id,
      role: "member",
    });

    if (error) {
      if (error.message.includes("duplicate")) return { error: "Je bent al lid van deze vakantie" };
      return { error: error.message };
    }

    await fetchTrips();
    switchTrip(trip.id);
    return {};
  }, [user, fetchTrips, switchTrip]);

  return (
    <TripContext.Provider
      value={{
        activeTrip,
        userTrips,
        tripMembers,
        isOrganizer,
        loading,
        switchTrip,
        createTrip,
        joinTrip,
        refreshTrips: fetchTrips,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}
