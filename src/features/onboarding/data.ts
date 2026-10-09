import { supabase } from "@/integrations/supabase/client";
import { listTripDocuments } from "@/features/documents/data";
import { listTripItems } from "@/features/travel/data";
import { listInvites } from "@/features/invites/data";

export type GettingStartedInput = {
  hasTrip: boolean;
  tripId: string | null;
  isOrganizer: boolean;
  memberCount: number;
  hasOpenInvite: boolean;
  hasBookedItem: boolean;
  hasDocument: boolean;
  hasAskedHansie: boolean;
};

export type GettingStartedStepKey = "trip" | "invite" | "item" | "document" | "hansie";

export type GettingStartedStep = {
  key: GettingStartedStepKey;
  title: string;
  tip?: string;
  done: boolean;
  href: string;
};

/**
 * The signed-in getting-started checklist. Organizers see five steps across
 * their next trip; invited travel companions only see the three steps that
 * help the group, under the heading "Help je groep".
 */
export function buildGettingStartedSteps(input: GettingStartedInput): GettingStartedStep[] {
  const tripId = input.tripId;
  const itemStep: GettingStartedStep = {
    key: "item",
    title: "Zet je vlucht of verblijf erin",
    tip: "Tip: plak je boekingsmail, dan vult Hansie het in.",
    done: input.hasBookedItem,
    href: tripId ? `/trip/${tripId}/reis` : "/new-trip",
  };
  const documentStep: GettingStartedStep = {
    key: "document",
    title: "Bewaar je tickets",
    done: input.hasDocument,
    href: tripId ? `/trip/${tripId}/reis` : "/new-trip",
  };
  const hansieStep: GettingStartedStep = {
    key: "hansie",
    title: "Stel Hansie een vraag",
    done: input.hasAskedHansie,
    href: tripId ? `/trip/${tripId}` : "/new-trip",
  };

  if (tripId && !input.isOrganizer) {
    return [itemStep, documentStep, hansieStep];
  }

  return [
    {
      key: "trip",
      title: "Maak je eerste reis",
      done: input.hasTrip,
      href: "/new-trip",
    },
    {
      key: "invite",
      title: "Nodig je reisgenoten uit",
      done: input.memberCount > 1 || input.hasOpenInvite,
      href: tripId ? `/trip/${tripId}/settings` : "/new-trip",
    },
    itemStep,
    documentStep,
    hansieStep,
  ];
}

export function gettingStartedDone(steps: GettingStartedStep[]) {
  return steps.length > 0 && steps.every((step) => step.done);
}

export type UsableInvite = {
  revoked_at: string | null;
  expires_at: string | null;
  use_count: number;
  max_uses: number;
};

/** An invite counts while it is not revoked, not expired and not used up. */
export function hasUsableInvite(invites: UsableInvite[], now: Date = new Date()) {
  return invites.some(
    (invite) =>
      !invite.revoked_at &&
      (!invite.expires_at || new Date(invite.expires_at) > now) &&
      invite.use_count < invite.max_uses,
  );
}

export type GettingStartedFacts = {
  memberCount: number;
  isOrganizer: boolean;
  hasBookedItem: boolean;
  hasDocument: boolean;
  hasOpenInvite: boolean;
  hasAskedHansie: boolean;
};

const emptyFacts: GettingStartedFacts = {
  memberCount: 0,
  isOrganizer: true,
  hasBookedItem: false,
  hasDocument: false,
  hasOpenInvite: false,
  hasAskedHansie: false,
};

/**
 * One read of everything the checklist ticks off, all scoped to the next trip.
 * Hansie usage is the user's own count across trips; the other facts are per trip.
 */
export async function getGettingStartedFacts(input: {
  tripId: string | null;
  userId: string;
}): Promise<GettingStartedFacts> {
  if (!input.tripId) return emptyFacts;

  const [membersResult, items, documents, usageResult] = await Promise.all([
    supabase.from("trip_members").select("user_id, role").eq("trip_id", input.tripId),
    listTripItems(input.tripId),
    listTripDocuments(input.tripId),
    supabase.from("ai_usage_events").select("id").eq("user_id", input.userId).limit(1),
  ]);

  const members = membersResult.data || [];
  const myRole = members.find((member) => member.user_id === input.userId)?.role;
  let invites: Awaited<ReturnType<typeof listInvites>> = [];
  if (myRole === "organizer") {
    try {
      invites = await listInvites(input.tripId);
    } catch {
      invites = [];
    }
  }

  return {
    memberCount: members.length,
    isOrganizer: myRole === "organizer",
    hasBookedItem: items.some((item) => item.status !== "idea" && item.status !== "cancelled"),
    hasDocument: documents.length > 0,
    hasOpenInvite: hasUsableInvite(invites),
    hasAskedHansie: (usageResult.data || []).length > 0,
  };
}
