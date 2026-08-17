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
  start_date: string | null;
  end_date: string | null;
  group_size: number;
  golf_min: number | null;
  golf_max: number | null;
  flights_note: string | null;
  destination_name?: string | null;
  destination_country?: string | null;
  timezone?: string | null;
  currency?: string;
}

interface TripMember {
  user_id: string;
  role: string;
}

interface CreateTripInput {
  name: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  group_size?: number;
  destination_name?: string;
  destination_country?: string;
  timezone?: string;
  currency?: string;
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

type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

// The database migration in BUILD 01 introduces these RPCs. Generated Supabase
// types are regenerated after that migration is applied; this narrow wrapper
// keeps the branch type-safe until then without weakening the rest of the client.
async function callVakansieRpc<T>(functionName: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  const rpc = supabase.rpc as unknown as (
    name: string,
    parameters: Record<string, unknown>,
  ) => Promise<RpcResult<T>>;

  return rpc(functionName, args);
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
      setTripMembers([]);
      setIsOrganizer(false);
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("trip_members")
      .select("trip_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setUserTrips([]);
      setActiveTrip(null);
      setTripMembers([]);
      setIsOrganizer(false);
      setLoading(false);
      return;
    }

    const tripIds = memberships.map((membership) => membership.trip_id);
    const { data: trips } = await supabase
      .from("trip")
      .select("*")
      .in("id", tripIds);

    if (trips && trips.length > 0) {
      const typedTrips = trips as Trip[];
      setUserTrips(typedTrips);

      const savedTripId = localStorage.getItem("vakansie_active_trip");
      const saved = typedTrips.find((trip) => trip.id === savedTripId);
      const selected = saved || typedTrips[0];
      setActiveTrip(selected);

      const membership = memberships.find((item) => item.trip_id === selected.id);
      setIsOrganizer(membership?.role === "organizer");

      const { data: members } = await supabase
        .from("trip_members")
        .select("user_id, role")
        .eq("trip_id", selected.id);
      setTripMembers((members as TripMember[]) || []);
    } else {
      setUserTrips([]);
      setActiveTrip(null);
      setTripMembers([]);
      setIsOrganizer(false);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchTrips();
  }, [fetchTrips]);

  const activateTrip = useCallback(async (tripId: string) => {
    if (!user) return null;

    const { data: trip, error: tripError } = await supabase
      .from("trip")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) return null;

    const [{ data: membership }, { data: members }] = await Promise.all([
      supabase
        .from("trip_members")
        .select("role")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("trip_members")
        .select("user_id, role")
        .eq("trip_id", tripId),
    ]);

    const typedTrip = trip as Trip;
    setActiveTrip(typedTrip);
    setIsOrganizer(membership?.role === "organizer");
    setTripMembers((members as TripMember[]) || []);
    localStorage.setItem("vakansie_active_trip", tripId);

    return typedTrip;
  }, [user]);

  const switchTrip = useCallback((tripId: string) => {
    void activateTrip(tripId);
  }, [activateTrip]);

  const createTrip = useCallback(async (data: CreateTripInput): Promise<Trip | null> => {
    if (!user) return null;

    const { data: tripId, error } = await callVakansieRpc<string>("create_trip_with_owner", {
      p_name: data.name,
      p_description: data.description ?? null,
      p_start_date: data.start_date || null,
      p_end_date: data.end_date || null,
      p_group_size: data.group_size ?? 1,
      p_destination_name: data.destination_name ?? null,
      p_destination_country: data.destination_country ?? null,
      p_timezone: data.timezone ?? null,
      p_currency: data.currency ?? "EUR",
    });

    if (error || !tripId) {
      console.error("create_trip_with_owner failed:", error?.message || "No trip id returned");
      return null;
    }

    const newTrip = await activateTrip(tripId);
    await fetchTrips();
    return newTrip;
  }, [user, activateTrip, fetchTrips]);

  const joinTrip = useCallback(async (inviteCode: string): Promise<{ error?: string }> => {
    if (!user) return { error: "Niet ingelogd" };

    const { data: tripId, error } = await callVakansieRpc<string>("join_trip_by_code", {
      p_invite_code: inviteCode,
    });

    if (error || !tripId) {
      if (error?.message.includes("invalid_invite")) {
        return { error: "Ongeldige uitnodigingscode" };
      }
      return { error: error?.message || "Deelnemen aan vakantie is mislukt" };
    }

    await activateTrip(tripId);
    await fetchTrips();
    return {};
  }, [user, activateTrip, fetchTrips]);

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
