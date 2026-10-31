import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { createExpenseWithSplits } from "@/features/together/data";
import { GUEST_KNAAKIE_KEY, guestImportRows, loadGuestKnaakie, removeGuestExpense, saveGuestKnaakie } from "./store";

/** Moves Knaakie costs made without an account into a trip once, right after sign-in. */
export function GuestKnaakieImport() {
  const { user } = useAuth();
  const { userTrips, loading, createTrip } = useTrip();
  const navigate = useNavigate();
  const running = useRef(false);

  useEffect(() => {
    if (!user || loading || running.current) return;
    const state = loadGuestKnaakie();
    if (!state.expenses.length) return;
    running.current = true;
    void (async () => {
      try {
        let tripId: string | null = null;
        try {
          const trip = await createTrip({ name: state.name.trim() || "Knaakie", currency: state.expenses[state.expenses.length - 1].currency, group_size: Math.max(1, state.people.length) });
          tripId = trip?.id || null;
        } catch {
          // Free plan already has an active trip: add the costs to that one.
          tripId = userTrips.find((trip) => trip.status !== "archived")?.id || null;
        }
        if (!tripId) throw new Error("no_trip");
        let remaining = state;
        for (const { id, ...row } of guestImportRows(state)) {
          await createExpenseWithSplits(tripId, { ...row, paidByUserId: user.id, splits: [{ user_id: user.id, amount: row.amount }] });
          // Drop each saved cost right away so a retry never creates duplicates.
          remaining = removeGuestExpense(remaining, id);
          saveGuestKnaakie(remaining);
        }
        localStorage.removeItem(GUEST_KNAAKIE_KEY);
        toast.success("Je Knaakie-kosten staan nu in je reis. Nodig je reisgenoten uit en pas de verdeling aan.", { duration: 10000 });
        navigate(`/trip/${tripId}/samen?section=expenses`, { replace: true });
      } catch {
        // No automatic retry this session; the next sign-in tries again with what is left.
        toast.error("Je Knaakie-kosten konden niet worden overgezet. Ze staan nog op dit apparaat.");
      }
    })();
  }, [user, loading, userTrips, createTrip, navigate]);

  return null;
}
