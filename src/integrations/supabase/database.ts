import type { Database as GeneratedDatabase, Json } from "./types";

/**
 * Exact schema overlay for database changes that are already live but cannot yet
 * be regenerated through the connected Supabase Management API.
 *
 * Keep this file small and temporary. When the canonical generator becomes
 * available, regenerate `types.ts`, remove the corresponding overlay here and
 * keep the exported Database API unchanged for the rest of the app.
 */

type GeneratedTables = GeneratedDatabase["public"]["Tables"];
type GeneratedFunctions = GeneratedDatabase["public"]["Functions"];

export type TripItemRow = {
  address: string | null;
  booking_reference: string | null;
  booking_url: string | null;
  created_at: string;
  created_by: string | null;
  currency: string | null;
  end_at: string | null;
  id: string;
  latitude: number | null;
  location_name: string | null;
  longitude: number | null;
  metadata: Json;
  notes: string | null;
  price: number | null;
  provider: string | null;
  start_at: string | null;
  status: string;
  timezone: string | null;
  title: string;
  trip_id: string;
  type: string;
  updated_at: string;
};

export type TripItemInsert = {
  address?: string | null;
  booking_reference?: string | null;
  booking_url?: string | null;
  created_at?: string;
  created_by?: string | null;
  currency?: string | null;
  end_at?: string | null;
  id?: string;
  latitude?: number | null;
  location_name?: string | null;
  longitude?: number | null;
  metadata?: Json;
  notes?: string | null;
  price?: number | null;
  provider?: string | null;
  start_at?: string | null;
  status?: string;
  timezone?: string | null;
  title: string;
  trip_id: string;
  type: string;
  updated_at?: string;
};

export type TripItemUpdate = Partial<Omit<TripItemInsert, "trip_id">>;

type TripItemsTable = {
  Row: TripItemRow;
  Insert: TripItemInsert;
  Update: TripItemUpdate;
  Relationships: [
    {
      foreignKeyName: "trip_items_trip_id_fkey";
      columns: ["trip_id"];
      isOneToOne: false;
      referencedRelation: "trip";
      referencedColumns: ["id"];
    },
  ];
};

export type TaskRow = GeneratedTables["tasks"]["Row"] & {
  created_by: string | null;
  description: string | null;
  due_at: string | null;
  priority: string;
};

export type TaskInsert = Omit<GeneratedTables["tasks"]["Insert"], "section"> & {
  section?: string;
  created_by?: string | null;
  description?: string | null;
  due_at?: string | null;
  priority?: string;
};

export type TaskUpdate = GeneratedTables["tasks"]["Update"] & {
  created_by?: string | null;
  description?: string | null;
  due_at?: string | null;
  priority?: string;
};

type TasksTable = {
  Row: TaskRow;
  Insert: TaskInsert;
  Update: TaskUpdate;
  Relationships: GeneratedTables["tasks"]["Relationships"];
};

export type ExpenseRow = Omit<GeneratedTables["expenses"]["Row"], "paid_by"> & {
  paid_by: string | null;
  currency: string;
};

export type ExpenseInsert = Omit<GeneratedTables["expenses"]["Insert"], "paid_by"> & {
  paid_by?: string | null;
  currency?: string;
};

export type ExpenseUpdate = Omit<GeneratedTables["expenses"]["Update"], "paid_by"> & {
  paid_by?: string | null;
  currency?: string;
};

type ExpensesTable = {
  Row: ExpenseRow;
  Insert: ExpenseInsert;
  Update: ExpenseUpdate;
  Relationships: GeneratedTables["expenses"]["Relationships"];
};

export type DecisionRow = {
  closes_at: string | null;
  created_at: string;
  created_by: string;
  description: string | null;
  id: string;
  max_choices: number;
  status: string;
  title: string;
  trip_id: string;
  updated_at: string;
};

export type DecisionInsert = {
  closes_at?: string | null;
  created_at?: string;
  created_by?: string;
  description?: string | null;
  id?: string;
  max_choices?: number;
  status?: string;
  title: string;
  trip_id: string;
  updated_at?: string;
};

export type DecisionUpdate = Partial<Omit<DecisionInsert, "trip_id" | "created_by">>;

type DecisionsTable = {
  Row: DecisionRow;
  Insert: DecisionInsert;
  Update: DecisionUpdate;
  Relationships: [
    {
      foreignKeyName: "decisions_trip_id_fkey";
      columns: ["trip_id"];
      isOneToOne: false;
      referencedRelation: "trip";
      referencedColumns: ["id"];
    },
  ];
};

export type DecisionOptionRow = {
  created_at: string;
  decision_id: string;
  description: string | null;
  id: string;
  label: string;
  sort_order: number;
  updated_at: string;
};

export type DecisionOptionInsert = {
  created_at?: string;
  decision_id: string;
  description?: string | null;
  id?: string;
  label: string;
  sort_order?: number;
  updated_at?: string;
};

export type DecisionOptionUpdate = Partial<Omit<DecisionOptionInsert, "decision_id">>;

type DecisionOptionsTable = {
  Row: DecisionOptionRow;
  Insert: DecisionOptionInsert;
  Update: DecisionOptionUpdate;
  Relationships: [
    {
      foreignKeyName: "decision_options_decision_id_fkey";
      columns: ["decision_id"];
      isOneToOne: false;
      referencedRelation: "decisions";
      referencedColumns: ["id"];
    },
  ];
};

export type DecisionVoteRow = {
  created_at: string;
  decision_id: string;
  id: string;
  option_id: string;
  user_id: string;
};

export type DecisionVoteInsert = {
  created_at?: string;
  decision_id: string;
  id?: string;
  option_id: string;
  user_id?: string;
};

type DecisionVotesTable = {
  Row: DecisionVoteRow;
  Insert: DecisionVoteInsert;
  Update: never;
  Relationships: [
    {
      foreignKeyName: "decision_votes_decision_id_fkey";
      columns: ["decision_id"];
      isOneToOne: false;
      referencedRelation: "decisions";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "decision_votes_option_decision_fkey";
      columns: ["option_id", "decision_id"];
      isOneToOne: false;
      referencedRelation: "decision_options";
      referencedColumns: ["id", "decision_id"];
    },
  ];
};

export type ExpenseSplitRow = {
  amount: number;
  created_at: string;
  expense_id: string;
  id: string;
  user_id: string;
};

type ExpenseSplitsTable = {
  Row: ExpenseSplitRow;
  Insert: never;
  Update: never;
  Relationships: [
    {
      foreignKeyName: "expense_splits_expense_id_fkey";
      columns: ["expense_id"];
      isOneToOne: false;
      referencedRelation: "expenses";
      referencedColumns: ["id"];
    },
  ];
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables" | "Functions"> & {
    Tables: Omit<GeneratedTables, "tasks" | "expenses"> & {
      trip_items: TripItemsTable;
      tasks: TasksTable;
      expenses: ExpensesTable;
      decisions: DecisionsTable;
      decision_options: DecisionOptionsTable;
      decision_votes: DecisionVotesTable;
      expense_splits: ExpenseSplitsTable;
    };
    Functions: GeneratedFunctions & {
      create_decision_with_options: {
        Args: {
          p_description: string;
          p_options: Json;
          p_title: string;
          p_trip_id: string;
        };
        Returns: string;
      };
      set_decision_vote: {
        Args: {
          p_decision_id: string;
          p_option_id: string;
        };
        Returns: string;
      };
      create_expense_with_splits: {
        Args: {
          p_amount: number;
          p_currency: string;
          p_description: string;
          p_paid_by_user_id: string;
          p_splits: Json;
          p_trip_id: string;
        };
        Returns: string;
      };
      update_expense_with_splits: {
        Args: {
          p_amount: number;
          p_currency: string;
          p_description: string;
          p_expense_id: string;
          p_paid_by_user_id: string;
          p_splits: Json;
        };
        Returns: string;
      };
    };
  };
};
