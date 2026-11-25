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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academic_calendars: {
        Row: {
          academic_year: string
          id: string
          scope: string
          source_id: string | null
          status: string
          university_id: string
        }
        Insert: {
          academic_year: string
          id?: string
          scope: string
          source_id?: string | null
          status?: string
          university_id: string
        }
        Update: {
          academic_year?: string
          id?: string
          scope?: string
          source_id?: string | null
          status?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendars_source_id_university_id_academic_year_fkey"
            columns: ["source_id", "university_id", "academic_year"]
            isOneToOne: false
            referencedRelation: "academic_sources"
            referencedColumns: ["id", "university_id", "academic_year"]
          },
          {
            foreignKeyName: "academic_calendars_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_sources: {
        Row: {
          academic_year: string
          checked_at: string
          id: string
          note: string
          scope: string
          title: string
          university_id: string
          url: string
        }
        Insert: {
          academic_year: string
          checked_at: string
          id?: string
          note?: string
          scope: string
          title: string
          university_id: string
          url: string
        }
        Update: {
          academic_year?: string
          checked_at?: string
          id?: string
          note?: string
          scope?: string
          title?: string
          university_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_sources_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          exam: number | null
          final_score: number | null
          rk1: number | null
          rk2: number | null
          student_subject_id: string
        }
        Insert: {
          exam?: number | null
          final_score?: number | null
          rk1?: number | null
          rk2?: number | null
          student_subject_id: string
        }
        Update: {
          exam?: number | null
          final_score?: number | null
          rk1?: number | null
          rk2?: number | null
          student_subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_student_subject_id_fkey"
            columns: ["student_subject_id"]
            isOneToOne: true
            referencedRelation: "student_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_student_subject_id_fkey"
            columns: ["student_subject_id"]
            isOneToOne: true
            referencedRelation: "student_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_terms: {
        Row: {
          calendar_id: string
          id: string
          period: Json | null
          rk1: Json | null
          rk2: Json | null
          season: string
        }
        Insert: {
          calendar_id: string
          id?: string
          period?: Json | null
          rk1?: Json | null
          rk2?: Json | null
          season: string
        }
        Update: {
          calendar_id?: string
          id?: string
          period?: Json | null
          rk1?: Json | null
          rk2?: Json | null
          season?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_terms_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "academic_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_forecasts: {
        Row: {
          grade: Database["public"]["Enums"]["letter_grade"]
          student_subject_id: string
        }
        Insert: {
          grade: Database["public"]["Enums"]["letter_grade"]
          student_subject_id: string
        }
        Update: {
          grade?: Database["public"]["Enums"]["letter_grade"]
          student_subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_forecasts_student_subject_id_fkey"
            columns: ["student_subject_id"]
            isOneToOne: true
            referencedRelation: "student_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_forecasts_student_subject_id_fkey"
            columns: ["student_subject_id"]
            isOneToOne: true
            referencedRelation: "student_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_groups: {
        Row: {
          group_id: string
          moderator_id: string
          moderator_role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          group_id: string
          moderator_id: string
          moderator_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          group_id?: string
          moderator_id?: string
          moderator_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "moderator_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderator_groups_moderator_id_moderator_role_fkey"
            columns: ["moderator_id", "moderator_role"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id", "role"]
          },
        ]
      }
      profiles: {
        Row: {
          first_name: string
          group_id: string | null
          id: string
          last_name: string
        }
        Insert: {
          first_name?: string
          group_id?: string | null
          id: string
          last_name?: string
        }
        Update: {
          first_name?: string
          group_id?: string | null
          id?: string
          last_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          id: string
          name: string
          university_id: string
        }
        Insert: {
          id?: string
          name: string
          university_id: string
        }
        Update: {
          id?: string
          name?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          is_active: boolean
          number: number
          title: string
        }
        Insert: {
          is_active?: boolean
          number: number
          title: string
        }
        Update: {
          is_active?: boolean
          number?: number
          title?: string
        }
        Relationships: []
      }
      student_subjects: {
        Row: {
          academic_year: string
          code: string
          credits: number
          id: string
          semester: number
          student_id: string
          subject_id: string
          title: string
        }
        Insert: {
          academic_year: string
          code: string
          credits: number
          id?: string
          semester: number
          student_id?: string
          subject_id: string
          title: string
        }
        Update: {
          academic_year?: string
          code?: string
          credits?: number
          id?: string
          semester?: number
          student_id?: string
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_semester_fkey"
            columns: ["semester"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "student_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          id: string
          name: string
          program_id: string
          year: number
        }
        Insert: {
          id?: string
          name: string
          program_id: string
          year: number
        }
        Update: {
          id?: string
          name?: string
          program_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_items: {
        Row: {
          group_id: string
          program_id: string
          semester: number
          subject_id: string
        }
        Insert: {
          group_id: string
          program_id: string
          semester: number
          subject_id: string
        }
        Update: {
          group_id?: string
          program_id?: string
          semester?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_items_group_id_program_id_fkey"
            columns: ["group_id", "program_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id", "program_id"]
          },
          {
            foreignKeyName: "study_plan_items_semester_fkey"
            columns: ["semester"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "study_plan_items_subject_id_program_id_fkey"
            columns: ["subject_id", "program_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "program_id"]
          },
        ]
      }
      subjects: {
        Row: {
          archived_at: string | null
          code: string
          credits: number
          id: string
          program_id: string
          title: string
        }
        Insert: {
          archived_at?: string | null
          code?: string
          credits: number
          id?: string
          program_id: string
          title: string
        }
        Update: {
          archived_at?: string | null
          code?: string
          credits?: number
          id?: string
          program_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      student_results: {
        Row: {
          academic_year: string | null
          code: string | null
          credits: number | null
          exam: number | null
          final_score: number | null
          grade: Database["public"]["Enums"]["letter_grade"] | null
          grade_points: number | null
          id: string | null
          rk1: number | null
          rk2: number | null
          semester: number | null
          student_id: string | null
          subject_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_semester_fkey"
            columns: ["semester"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "student_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      backend_health: { Args: never; Returns: string }
      grade_from_score: {
        Args: { score: number }
        Returns: Database["public"]["Enums"]["letter_grade"]
      }
    }
    Enums: {
      app_role: "student" | "moderator" | "admin"
      letter_grade:
        | "A"
        | "A−"
        | "B+"
        | "B"
        | "B−"
        | "C+"
        | "C"
        | "C−"
        | "D+"
        | "D"
        | "FX"
        | "F"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["student", "moderator", "admin"],
      letter_grade: [
        "A",
        "A−",
        "B+",
        "B",
        "B−",
        "C+",
        "C",
        "C−",
        "D+",
        "D",
        "FX",
        "F",
      ],
    },
  },
} as const
