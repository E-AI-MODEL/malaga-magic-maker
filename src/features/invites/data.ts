import { supabase } from "@/integrations/supabase/client";
import type { TripInviteRow, TripInviteUseRow } from "@/integrations/supabase/database-build06";

export type InvitePreview = {
  valid: boolean;
  trip_name?: string;
  destination_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  email_restricted?: boolean;
};

export type InviteView = TripInviteRow & {
  uses: TripInviteUseRow[];
};

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc("get_trip_invite_preview", { p_token: token });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) return { valid: false };
  return data as InvitePreview;
}

export async function acceptInvite(token: string) {
  const { data, error } = await supabase.rpc("accept_trip_invite", { p_token: token });
  if (error) throw error;
  return data;
}

export async function createInvite(input: {
  tripId: string;
  email?: string | null;
  expiresHours: number;
  maxUses: number;
}) {
  const { data, error } = await supabase.rpc("create_trip_invite", {
    p_trip_id: input.tripId,
    p_email: input.email || null,
    p_expires_hours: input.expiresHours,
    p_max_uses: input.maxUses,
  });
  if (error) throw error;
  return data;
}

export async function revokeInvite(inviteId: string) {
  const { data, error } = await supabase.rpc("revoke_trip_invite", { p_invite_id: inviteId });
  if (error) throw error;
  return data;
}

export async function listInvites(tripId: string): Promise<InviteView[]> {
  const { data: invites, error: inviteError } = await supabase
    .from("trip_invites")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (inviteError) throw inviteError;
  if (!invites?.length) return [];

  const inviteIds = invites.map((invite) => invite.id);
  const { data: uses, error: useError } = await supabase
    .from("trip_invite_uses")
    .select("*")
    .in("invite_id", inviteIds);
  if (useError) throw useError;

  const byInvite = new Map<string, TripInviteUseRow[]>();
  for (const use of uses || []) {
    byInvite.set(use.invite_id, [...(byInvite.get(use.invite_id) || []), use]);
  }

  return invites.map((invite) => ({ ...invite, uses: byInvite.get(invite.id) || [] }));
}
