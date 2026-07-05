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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          ai_suggested_causes: Json | null
          analyzer_id: string
          created_at: string
          deviation_summary: Json | null
          dtc_code: string | null
          id: string
          session_id: string
          status: string
          vehicle_id: string
        }
        Insert: {
          ai_suggested_causes?: Json | null
          analyzer_id: string
          created_at?: string
          deviation_summary?: Json | null
          dtc_code?: string | null
          id?: string
          session_id: string
          status?: string
          vehicle_id: string
        }
        Update: {
          ai_suggested_causes?: Json | null
          analyzer_id?: string
          created_at?: string
          deviation_summary?: Json | null
          dtc_code?: string | null
          id?: string
          session_id?: string
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      field_checks: {
        Row: {
          checklist_results: Json | null
          created_at: string
          id: string
          integrator_id: string
          notes: string | null
          outcome: string
          report_id: string
          vehicle_id: string
        }
        Insert: {
          checklist_results?: Json | null
          created_at?: string
          id?: string
          integrator_id: string
          notes?: string | null
          outcome: string
          report_id: string
          vehicle_id: string
        }
        Update: {
          checklist_results?: Json | null
          created_at?: string
          id?: string
          integrator_id?: string
          notes?: string | null
          outcome?: string
          report_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_checks_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_checks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
          vehicle_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
          vehicle_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["app_role"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          case_load: number
          created_at: string
          email: string
          id: string
          is_online: boolean
          name: string
        }
        Insert: {
          case_load?: number
          created_at?: string
          email: string
          id: string
          is_online?: boolean
          name: string
        }
        Update: {
          case_load?: number
          created_at?: string
          email?: string
          id?: string
          is_online?: boolean
          name?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          analysis_id: string
          created_at: string
          evidence: string
          history_notes: string | null
          id: string
          issue: string
          recommended_fix: string
          sent_to_integrator_id: string | null
          status: string
          vehicle_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          evidence: string
          history_notes?: string | null
          id?: string
          issue: string
          recommended_fix: string
          sent_to_integrator_id?: string | null
          status?: string
          vehicle_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          evidence?: string
          history_notes?: string | null
          id?: string
          issue?: string
          recommended_fix?: string
          sent_to_integrator_id?: string | null
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      sessions: {
        Row: {
          completeness_score: number | null
          created_at: string
          dtc_code: string | null
          end_time: string | null
          id: string
          samples: Json
          sent_to_analyzer_id: string | null
          start_time: string
          status: string
          tester_id: string
          vehicle_id: string
        }
        Insert: {
          completeness_score?: number | null
          created_at?: string
          dtc_code?: string | null
          end_time?: string | null
          id?: string
          samples?: Json
          sent_to_analyzer_id?: string | null
          start_time?: string
          status?: string
          tester_id: string
          vehicle_id: string
        }
        Update: {
          completeness_score?: number | null
          created_at?: string
          dtc_code?: string | null
          end_time?: string | null
          id?: string
          samples?: Json
          sent_to_analyzer_id?: string | null
          start_time?: string
          status?: string
          tester_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["vehicle_id"]
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
      vehicles: {
        Row: {
          created_at: string
          fleet: string
          model: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          fleet: string
          model: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          fleet?: string
          model?: string
          vehicle_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "tester" | "analyzer" | "integrator" | "admin"
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
      app_role: ["tester", "analyzer", "integrator", "admin"],
    },
  },
} as const
