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
    PostgrestVersion: "14.17"
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
      activity_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          message: string
          metadata: Json
          trip_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          message: string
          metadata?: Json
          trip_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_trip_id_fkey"
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
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
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
      ai_usage_events: {
        Row: {
          created_at: string
          feature: string
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature?: string
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
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
      client_error_events: {
        Row: {
          area: string
          context: Json
          created_at: string
          id: string
          message: string
          trip_id: string | null
          user_id: string | null
        }
        Insert: {
          area: string
          context?: Json
          created_at?: string
          id?: string
          message: string
          trip_id?: string | null
          user_id?: string | null
        }
        Update: {
          area?: string
          context?: Json
          created_at?: string
          id?: string
          message?: string
          trip_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_error_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
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
      decision_options: {
        Row: {
          created_at: string
          decision_id: string
          description: string | null
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_id: string
          description?: string | null
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_id?: string
          description?: string | null
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_options_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_votes: {
        Row: {
          created_at: string
          decision_id: string
          id: string
          option_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          decision_id: string
          id?: string
          option_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          decision_id?: string
          id?: string
          option_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_votes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_votes_option_decision_fkey"
            columns: ["option_id", "decision_id"]
            isOneToOne: false
            referencedRelation: "decision_options"
            referencedColumns: ["id", "decision_id"]
          },
        ]
      }
      decisions: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          max_choices: number
          status: string
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_choices?: number
          status?: string
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_choices?: number
          status?: string
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          expires_at: string | null
          granted_at: string
          id: string
          price_id: string
          product_id: string
          stripe_customer_id: string | null
          stripe_session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          environment?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          price_id: string
          product_id?: string
          stripe_customer_id?: string | null
          stripe_session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          price_id?: string
          product_id?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_splits: {
        Row: {
          amount: number
          created_at: string
          expense_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          expense_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          expense_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          description: string
          id: string
          paid_by: string | null
          paid_by_user_id: string | null
          split_among: string[]
          trip_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          id?: string
          paid_by?: string | null
          paid_by_user_id?: string | null
          split_among?: string[]
          trip_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          id?: string
          paid_by?: string | null
          paid_by_user_id?: string | null
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
      notification_preferences: {
        Row: {
          decisions: boolean
          task_assignments: boolean
          trip_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          decisions?: boolean
          task_assignments?: boolean
          trip_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          decisions?: boolean
          task_assignments?: boolean
          trip_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          from_user_id: string
          id: string
          message: string
          payload: Json
          read: boolean
          task_id: string | null
          trip_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          from_user_id: string
          id?: string
          message: string
          payload?: Json
          read?: boolean
          task_id?: string | null
          trip_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          from_user_id?: string
          id?: string
          message?: string
          payload?: Json
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
      poi_categories: {
        Row: {
          color_threshold_good: number
          color_threshold_ok: number
          created_at: string
          emoji: string
          id: string
          key: string
          label: string
          sort_order: number
          trip_id: string | null
        }
        Insert: {
          color_threshold_good?: number
          color_threshold_ok?: number
          created_at?: string
          emoji?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          trip_id?: string | null
        }
        Update: {
          color_threshold_good?: number
          color_threshold_ok?: number
          created_at?: string
          emoji?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poi_categories_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      pois: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          name: string
          sort_order: number
          travel_times: Json
          url: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name: string
          sort_order?: number
          travel_times?: Json
          url?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          sort_order?: number
          travel_times?: Json
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pois_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "poi_categories"
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
          assigned_user_id: string | null
          backup_to: string | null
          backup_user_id: string | null
          cost: number | null
          cost_split_among: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          info_details: Json
          info_image_urls: string[]
          info_text: string | null
          paid_by: string | null
          priority: string
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
          assigned_user_id?: string | null
          backup_to?: string | null
          backup_user_id?: string | null
          cost?: number | null
          cost_split_among?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          info_details?: Json
          info_image_urls?: string[]
          info_text?: string | null
          paid_by?: string | null
          priority?: string
          progress?: number
          section?: string
          sort_order?: number
          status?: string
          title: string
          trip_id?: string | null
          voting_closed?: boolean
        }
        Update: {
          assigned_to?: string | null
          assigned_user_id?: string | null
          backup_to?: string | null
          backup_user_id?: string | null
          cost?: number | null
          cost_split_among?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          info_details?: Json
          info_image_urls?: string[]
          info_text?: string | null
          paid_by?: string | null
          priority?: string
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
          currency: string
          description: string | null
          destination_country: string | null
          destination_name: string | null
          end_date: string | null
          flights_note: string | null
          golf_max: number | null
          golf_min: number | null
          group_size: number
          id: string
          name: string
          start_date: string | null
          status: string
          timezone: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          destination_country?: string | null
          destination_name?: string | null
          end_date?: string | null
          flights_note?: string | null
          golf_max?: number | null
          golf_min?: number | null
          group_size?: number
          id?: string
          name: string
          start_date?: string | null
          status?: string
          timezone?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          destination_country?: string | null
          destination_name?: string | null
          end_date?: string | null
          flights_note?: string | null
          golf_max?: number | null
          golf_min?: number | null
          group_size?: number
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          timezone?: string | null
        }
        Relationships: []
      }
      trip_documents: {
        Row: {
          created_at: string
          document_type: string
          extracted_at: string | null
          extracted_suggestion: Json | null
          extracted_summary: string | null
          extracted_text: string | null
          extraction_status: string
          filename: string
          id: string
          mime_type: string
          ready_at: string | null
          size_bytes: number | null
          status: string
          storage_path: string
          trip_id: string
          trip_item_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string
          extracted_at?: string | null
          extracted_suggestion?: Json | null
          extracted_summary?: string | null
          extracted_text?: string | null
          extraction_status?: string
          filename: string
          id?: string
          mime_type: string
          ready_at?: string | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          trip_id: string
          trip_item_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          extracted_at?: string | null
          extracted_suggestion?: Json | null
          extracted_summary?: string | null
          extracted_text?: string | null
          extraction_status?: string
          filename?: string
          id?: string
          mime_type?: string
          ready_at?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
          trip_id?: string
          trip_item_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_documents_trip_item_id_fkey"
            columns: ["trip_item_id"]
            isOneToOne: false
            referencedRelation: "trip_items"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invite_uses: {
        Row: {
          id: string
          invite_id: string
          used_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          invite_id: string
          used_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          invite_id?: string
          used_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_invite_uses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "trip_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email_normalized: string | null
          expires_at: string
          id: string
          max_uses: number
          revoked_at: string | null
          role: string
          token_hash: string
          trip_id: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email_normalized?: string | null
          expires_at: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          role?: string
          token_hash: string
          trip_id: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email_normalized?: string | null
          expires_at?: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          role?: string
          token_hash?: string
          trip_id?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "trip_invites_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_items: {
        Row: {
          address: string | null
          booking_reference: string | null
          booking_url: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          end_at: string | null
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          metadata: Json
          notes: string | null
          price: number | null
          provider: string | null
          start_at: string | null
          status: string
          timezone: string | null
          title: string
          trip_id: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          booking_reference?: string | null
          booking_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          end_at?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          metadata?: Json
          notes?: string | null
          price?: number | null
          provider?: string | null
          start_at?: string | null
          status?: string
          timezone?: string | null
          title: string
          trip_id: string
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          booking_reference?: string | null
          booking_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          end_at?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          metadata?: Json
          notes?: string | null
          price?: number | null
          provider?: string | null
          start_at?: string | null
          status?: string
          timezone?: string | null
          title?: string
          trip_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
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
      accept_trip_invite: { Args: { p_token: string }; Returns: string }
      consume_hansie_quota: { Args: { p_trip_id: string }; Returns: Json }
      create_decision_with_options: {
        Args: {
          p_description: string
          p_options: Json
          p_title: string
          p_trip_id: string
        }
        Returns: string
      }
      create_expense_with_splits: {
        Args: {
          p_amount: number
          p_currency: string
          p_description: string
          p_paid_by_user_id: string
          p_splits: Json
          p_trip_id: string
        }
        Returns: string
      }
      create_trip_invite: {
        Args: {
          p_email?: string
          p_expires_hours?: number
          p_max_uses?: number
          p_trip_id: string
        }
        Returns: string
      }
      create_trip_with_owner: {
        Args: {
          p_currency?: string
          p_description?: string
          p_destination_country?: string
          p_destination_name?: string
          p_end_date?: string
          p_group_size?: number
          p_name: string
          p_start_date?: string
          p_timezone?: string
        }
        Returns: string
      }
      emit_trip_activity: {
        Args: {
          p_actor: string
          p_entity_id: string
          p_entity_type: string
          p_event_type: string
          p_message: string
          p_metadata?: Json
          p_trip_id: string
        }
        Returns: undefined
      }
      emit_user_notification: {
        Args: {
          p_actor: string
          p_category: string
          p_entity_id: string
          p_entity_type: string
          p_event_type: string
          p_message: string
          p_payload?: Json
          p_trip_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      export_my_vakansie_data: { Args: never; Returns: Json }
      finalize_trip_document: {
        Args: { p_document_id: string; p_size_bytes: number }
        Returns: boolean
      }
      get_my_account_deletion_blockers: { Args: never; Returns: Json }
      get_my_plan_status: { Args: never; Returns: Json }
      get_trip_invite_preview: { Args: { p_token: string }; Returns: Json }
      get_trip_readiness: { Args: { p_trip_id: string }; Returns: Json }
      get_username: { Args: { _user_id: string }; Returns: string }
      has_pro_access: {
        Args: { _environment?: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pro_user: { Args: { _user_id: string }; Returns: boolean }
      is_trip_member: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_organizer: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      notification_category_enabled: {
        Args: { p_category: string; p_user_id: string }
        Returns: boolean
      }
      ops_delete_trip: { Args: { p_trip_id: string }; Returns: boolean }
      ops_delete_user: { Args: { p_user_id: string }; Returns: boolean }
      ops_get_system_summary: { Args: never; Returns: Json }
      ops_get_trip_overview: { Args: { p_trip_id: string }; Returns: Json }
      ops_get_user_overview: { Args: { p_user_id: string }; Returns: Json }
      ops_grant_pro: {
        Args: { p_note?: string; p_user_id: string }
        Returns: boolean
      }
      ops_list_settings: { Args: never; Returns: Json }
      ops_revoke_pro: {
        Args: { p_note?: string; p_user_id: string }
        Returns: boolean
      }
      ops_revoke_trip_invite: {
        Args: { p_invite_id: string }
        Returns: boolean
      }
      ops_search_trips: {
        Args: { p_limit?: number; p_query?: string }
        Returns: Json
      }
      ops_search_users: {
        Args: { p_limit?: number; p_query?: string }
        Returns: Json
      }
      ops_set_setting: {
        Args: { p_key: string; p_value: string }
        Returns: boolean
      }
      ops_set_trip_status: {
        Args: { p_status: string; p_trip_id: string }
        Returns: boolean
      }
      record_client_error: {
        Args: {
          p_area: string
          p_context?: Json
          p_message: string
          p_trip_id?: string
        }
        Returns: boolean
      }
      reserve_trip_document: {
        Args: {
          p_document_type?: string
          p_filename: string
          p_mime_type: string
          p_trip_id: string
          p_trip_item_id: string
        }
        Returns: Json
      }
      revoke_invites_for_user_deletion: {
        Args: { p_user_id: string }
        Returns: number
      }
      revoke_trip_invite: { Args: { p_invite_id: string }; Returns: boolean }
      set_decision_vote: {
        Args: { p_decision_id: string; p_option_id: string }
        Returns: string
      }
      shares_trip_with: {
        Args: { _other_id: string; _viewer_id: string }
        Returns: boolean
      }
      update_expense_with_splits: {
        Args: {
          p_amount: number
          p_currency: string
          p_description: string
          p_expense_id: string
          p_paid_by_user_id: string
          p_splits: Json
        }
        Returns: string
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
