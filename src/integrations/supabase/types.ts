export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accommodations: {
        Row: {
          agp_minutes: number | null
          bathrooms: number
          beach_meters: number | null
          bedrooms: number
          cancellation_type: string
          created_at: string
          currency: string
          eliminated_reason: string | null
          fixed_beds_count: number
          golf_km: number | null
          golf_minutes: number | null
          id: string
          image_urls: string[]
          lat: number
          listing_url: string | null
          lng: number
          location_label: string
          max_guests: number
          name: string
          notes: string | null
          parking: string
          price_notes: string | null
          sources: Json
          status: string
          tags: string[]
          total_price_3_nights: number | null
          transparent_price_confirmed: boolean
          trip_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          agp_minutes?: number | null
          bathrooms?: number
          beach_meters?: number | null
          bedrooms?: number
          cancellation_type?: string
          created_at?: string
          currency?: string
          eliminated_reason?: string | null
          fixed_beds_count?: number
          golf_km?: number | null
          golf_minutes?: number | null
          id?: string
          image_urls?: string[]
          lat: number
          listing_url?: string | null
          lng: number
          location_label: string
          max_guests?: number
          name: string
          notes?: string | null
          parking?: string
          price_notes?: string | null
          sources?: Json
          status?: string
          tags?: string[]
          total_price_3_nights?: number | null
          transparent_price_confirmed?: boolean
          trip_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          agp_minutes?: number | null
          bathrooms?: number
          beach_meters?: number | null
          bedrooms?: number
          cancellation_type?: string
          created_at?: string
          currency?: string
          eliminated_reason?: string | null
          fixed_beds_count?: number
          golf_km?: number | null
          golf_minutes?: number | null
          id?: string
          image_urls?: string[]
          lat?: number
          listing_url?: string | null
          lng?: number
          location_label?: string
          max_guests?: number
          name?: string
          notes?: string | null
          parking?: string
          price_notes?: string | null
          sources?: Json
          status?: string
          tags?: string[]
          total_price_3_nights?: number | null
          transparent_price_confirmed?: boolean
          trip_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          created_at: string
          detail: string | null
          event_type: string
          id: string
          page: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          page: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          page?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_overrides: {
        Row: {
          admin_user_id: string
          created_at: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          created_at: string
          id: string
          message: string
          section: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          section: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          section?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string
          id: string
          paid_by: string
          split_among: string[]
          trip_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description: string
          id?: string
          paid_by: string
          split_among?: string[]
          trip_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          paid_by?: string
          split_among?: string[]
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          message: string
          read: boolean
          task_id: string | null
          trip_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          message: string
          read?: boolean
          task_id?: string | null
          trip_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          read?: boolean
          task_id?: string | null
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          section: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          section: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          section?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          activities: string[] | null
          agreed_facts: boolean
          base_choice: string
          budget_cap_total: number | null
          created_at: string
          diet_preferences: string[] | null
          diet_remarks: string | null
          id: string
          locked: boolean
          max_golf_minutes: number
          mobility_choice: string
          points_beach_life: number
          points_budget: number
          points_exploring: number
          points_golf_ease: number
          points_low_hassle: number
          points_luxury: number
          preferred_rounds: number
          remarks_a: string | null
          remarks_b: string | null
          require_airco: boolean
          require_bedrooms_3: boolean
          require_cancelable: boolean
          require_fixed_beds: boolean
          require_parking: boolean
          require_pool: boolean
          require_terrace: boolean
          require_transparent_price: boolean
          require_wifi: boolean
          top_accommodations: string[] | null
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activities?: string[] | null
          agreed_facts?: boolean
          base_choice?: string
          budget_cap_total?: number | null
          created_at?: string
          diet_preferences?: string[] | null
          diet_remarks?: string | null
          id?: string
          locked?: boolean
          max_golf_minutes?: number
          mobility_choice?: string
          points_beach_life?: number
          points_budget?: number
          points_exploring?: number
          points_golf_ease?: number
          points_low_hassle?: number
          points_luxury?: number
          preferred_rounds?: number
          remarks_a?: string | null
          remarks_b?: string | null
          require_airco?: boolean
          require_bedrooms_3?: boolean
          require_cancelable?: boolean
          require_fixed_beds?: boolean
          require_parking?: boolean
          require_pool?: boolean
          require_terrace?: boolean
          require_transparent_price?: boolean
          require_wifi?: boolean
          top_accommodations?: string[] | null
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activities?: string[] | null
          agreed_facts?: boolean
          base_choice?: string
          budget_cap_total?: number | null
          created_at?: string
          diet_preferences?: string[] | null
          diet_remarks?: string | null
          id?: string
          locked?: boolean
          max_golf_minutes?: number
          mobility_choice?: string
          points_beach_life?: number
          points_budget?: number
          points_exploring?: number
          points_golf_ease?: number
          points_low_hassle?: number
          points_luxury?: number
          preferred_rounds?: number
          remarks_a?: string | null
          remarks_b?: string | null
          require_airco?: boolean
          require_bedrooms_3?: boolean
          require_cancelable?: boolean
          require_fixed_beds?: boolean
          require_parking?: boolean
          require_pool?: boolean
          require_terrace?: boolean
          require_transparent_price?: boolean
          require_wifi?: boolean
          top_accommodations?: string[] | null
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      task_votes: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
          voted_for_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
          voted_for_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
          voted_for_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_votes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          backup_to: string | null
          cost: number | null
          cost_split_among: string[] | null
          created_at: string
          id: string
          info_details: Json
          info_image_urls: string[]
          info_text: string | null
          paid_by: string | null
          progress: number
          section: string
          sort_order: number
          status: string
          title: string
          trip_id: string | null
          voting_closed: boolean
        }
        Insert: {
          assigned_to?: string | null
          backup_to?: string | null
          cost?: number | null
          cost_split_among?: string[] | null
          created_at?: string
          id?: string
          info_details?: Json
          info_image_urls?: string[]
          info_text?: string | null
          paid_by?: string | null
          progress?: number
          section: string
          sort_order?: number
          status?: string
          title: string
          trip_id?: string | null
          voting_closed?: boolean
        }
        Update: {
          assigned_to?: string | null
          backup_to?: string | null
          cost?: number | null
          cost_split_among?: string[] | null
          created_at?: string
          id?: string
          info_details?: Json
          info_image_urls?: string[]
          info_text?: string | null
          paid_by?: string | null
          progress?: number
          section?: string
          sort_order?: number
          status?: string
          title?: string
          trip_id?: string | null
          voting_closed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tasks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_legs: {
        Row: {
          arrival_time: string | null
          created_at: string
          departure_time: string | null
          id: string
          note: string | null
          passengers: string[]
          sort_order: number
          travel_date: string | null
          trip_id: string | null
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string | null
          id?: string
          note?: string | null
          passengers?: string[]
          sort_order?: number
          travel_date?: string | null
          trip_id?: string | null
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string | null
          id?: string
          note?: string | null
          passengers?: string[]
          sort_order?: number
          travel_date?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_legs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      trip: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          flights_note: string
          golf_max: number
          golf_min: number
          group_size: number
          id: string
          invite_code: string | null
          name: string
          start_date: string
          status: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          flights_note?: string
          golf_max?: number
          golf_min?: number
          group_size?: number
          id?: string
          invite_code?: string | null
          name?: string
          start_date?: string
          status?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          flights_note?: string
          golf_max?: number
          golf_min?: number
          group_size?: number
          id?: string
          invite_code?: string | null
          name?: string
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      trip_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_username: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "participant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "participant"],
    },
  },
} as const
