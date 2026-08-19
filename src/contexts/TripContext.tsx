import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  cover_image_url: string | null;
  status: string;
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

export interface UpdateTripInput {
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  group_size?: number;
  destination_name?: string | null;
  destination_country?: string | null;
  timezone?: string | null;
  currency?: string;
}

interface TripContextType {
  activeTrip: Trip | null;
  userTrips: Trip[];
  tripMembers: TripMember[];
  isOrganizer: boolean;
  loading: boolean;
  openTrip: (tripId: string) => Promise<Trip | null>;
  switchTrip: (tripId: string) => void;
  createTrip: (data: CreateTripInput) => Promise<Trip | null>;
  updateTrip: (tripId: string, data: UpdateTripInput) => Promise<Trip | null>;
  archiveTrip: (tripId: string) => Promise<boolean>;
  restoreTrip: (tripId: string) => Promise<boolean>;
  joinTrip: (inviteToken: string) => Promise<{ tripId?: string; error?: string }>;
  refreshTrips: () => Promise<void>;
}

type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

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

    setLoading(true);
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

    const typedTrips = (trips as Trip[] | null) || [];
    setUserTrips(typedTrips);
    setActiveTrip((current) => {
      if (!current) return null;
      return typedTrips.find((trip) => trip.id === current.id) || null;
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchTrips();
  }, [fetchTrips]);

  const openTrip = useCallback(async (tripId: string) => {
    if (!user) return null;

    const [{ data: trip, error: tripError }, { data: membership, error: membershipError }, { data: members }] = await Promise.all([
      supabase.from("trip").select("*").eq("id", tripId).single(),
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

    if (tripError || membershipError || !trip || !membership) return null;

    const typedTrip = trip as Trip;
    setActiveTrip(typedTrip);
    setIsOrganizer(membership.role === "organizer");
    setTripMembers((members as TripMember[]) || []);

    // Convenience only. Route tripId remains authoritative when a trip is opened.
    localStorage.setItem("vakansie_recent_trip", tripId);

    return typedTrip;
  }, [user]);

  const switchTrip = useCallback((tripId: string) => {
    void openTrip(tripId);
  }, [openTrip]);

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

    await fetchTrips();
    return openTrip(tripId);
  }, [user, fetchTrips, openTrip]);

  const updateTrip = useCallback(async (tripId: string, data: UpdateTripInput): Promise<Trip | null> => {
    if (!user) return null;

    const { error } = await supabase
      .from("trip")
      .update({
        name: data.name.trim(),
        description: data.description ?? null,
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        group_size: Math.max(1, data.group_size ?? 1),
        destination_name: data.destination_name ?? null,
        destination_country: data.destination_country ?? null,
        timezone: data.timezone ?? null,
        currency: data.currency ?? "EUR",
      })
      .eq("id", tripId);

    if (error) {
      console.error("trip update failed:", error.message);
      return null;
    }

    await fetchTrips();
    return openTrip(tripId);
  }, [user, fetchTrips, openTrip]);

  const setTripStatus = useCallback(async (tripId: string, status: "planning" | "archived") => {
    if (!user) return false;

    const { error } = await supabase.from("trip").update({ status }).eq("id", tripId);
    if (error) {
      console.error("trip status update failed:", error.message);
      return false;
    }

    await fetchTrips();
    await openTrip(tripId);
    return true;
  }, [user, fetchTrips, openTrip]);

  const archiveTrip = useCallback((tripId: string) => setTripStatus(tripId, "archived"), [setTripStatus]);
  const restoreTrip = useCallback((tripId: string) => setTripStatus(tripId, "planning"), [setTripStatus]);

  const joinTrip = useCallback(async (inviteToken: string): Promise<{ tripId?: string; error?: string }> => {
    if (!user) return { error: "Niet ingelogd" };

    const { data: tripId, error } = await callVakansieRpc<string>("accept_trip_invite", {
      p_token: inviteToken,
    });

    if (error || !tripId) {
      if (error?.message.includes("invalid_invite")) {
        return { error: "Deze uitnodiging is niet geldig" };
      }
      if (error?.message.includes("invite_unavailable")) {
        return { error: "Deze uitnodiging is verlopen of ingetrokken" };
      }
      if (error?.message.includes("invite_email_mismatch")) {
        return { error: "Deze uitnodiging hoort bij een ander e-mailadres" };
      }
      return { error: error?.message || "Deelnemen aan reis is mislukt" };
    }

    await fetchTrips();
    const opened = await openTrip(tripId);
    if (!opened) return { error: "De reis kon na deelname niet worden geopend" };
    return { tripId };
  }, [user, fetchTrips, openTrip]);

  return (
    <TripContext.Provider
      value={{
        activeTrip,
        userTrips,
        tripMembers,
        isOrganizer,
        loading,
        openTrip,
        switchTrip,
        createTrip,
        updateTrip,
        archiveTrip,
        restoreTrip,
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
