import type { Database as Build05Database } from "./database";
import type { Json } from "./types";

type BaseTables = Build05Database["public"]["Tables"];
type BaseFunctions = Build05Database["public"]["Functions"];

export type TripInviteRow = {
  created_at: string;
  created_by: string;
  email_normalized: string | null;
  expires_at: string;
  id: string;
  max_uses: number;
  revoked_at: string | null;
  role: string;
  token_hash: string;
  trip_id: string;
  use_count: number;
};

type TripInvitesTable = {
  Row: TripInviteRow;
  Insert: never;
  Update: never;
  Relationships: [
    {
      foreignKeyName: "trip_invites_trip_id_fkey";
      columns: ["trip_id"];
      isOneToOne: false;
      referencedRelation: "trip";
      referencedColumns: ["id"];
    },
  ];
};

export type TripInviteUseRow = {
  id: string;
  invite_id: string;
  user_id: string;
  used_at: string;
};

type TripInviteUsesTable = {
  Row: TripInviteUseRow;
  Insert: never;
  Update: never;
  Relationships: [
    {
      foreignKeyName: "trip_invite_uses_invite_id_fkey";
      columns: ["invite_id"];
      isOneToOne: false;
      referencedRelation: "trip_invites";
      referencedColumns: ["id"];
    },
  ];
};

export type Database = Omit<Build05Database, "public"> & {
  public: Omit<Build05Database["public"], "Tables" | "Functions"> & {
    Tables: BaseTables & {
      trip_invites: TripInvitesTable;
      trip_invite_uses: TripInviteUsesTable;
    };
    Functions: BaseFunctions & {
      create_trip_invite: {
        Args: {
          p_email?: string | null;
          p_expires_hours?: number;
          p_max_uses?: number;
          p_trip_id: string;
        };
        Returns: string;
      };
      get_trip_invite_preview: {
        Args: { p_token: string };
        Returns: Json;
      };
      accept_trip_invite: {
        Args: { p_token: string };
        Returns: string;
      };
      revoke_trip_invite: {
        Args: { p_invite_id: string };
        Returns: boolean;
      };
    };
  };
};
