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
      battle_history: {
        Row: {
          created_at: string
          id: string
          mode: string
          opponent: string
          player: string
          result: string
          score: number
          streak: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          opponent: string
          player: string
          result: string
          score?: number
          streak?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          opponent?: string
          player?: string
          result?: string
          score?: number
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      community_questions: {
        Row: {
          author: string
          author_id: string | null
          correct_index: number
          created_at: string
          exam: string
          explanation: string
          id: string
          options: Json
          question: string
          subject: string
        }
        Insert: {
          author?: string
          author_id?: string | null
          correct_index: number
          created_at?: string
          exam: string
          explanation?: string
          id?: string
          options: Json
          question: string
          subject: string
        }
        Update: {
          author?: string
          author_id?: string | null
          correct_index?: number
          created_at?: string
          exam?: string
          explanation?: string
          id?: string
          options?: Json
          question?: string
          subject?: string
        }
        Relationships: []
      }
      duel_invites: {
        Row: {
          created_at: string
          custom_topic: string
          exam: string
          lobby_id: string
          num_questions: number
          receiver_id: string
          sender_id: string
          sender_name: string
          status: string
          subject: string
          total_questions: number
        }
        Insert: {
          created_at?: string
          custom_topic?: string
          exam?: string
          lobby_id: string
          num_questions?: number
          receiver_id: string
          sender_id: string
          sender_name: string
          status?: string
          subject?: string
          total_questions?: number
        }
        Update: {
          created_at?: string
          custom_topic?: string
          exam?: string
          lobby_id?: string
          num_questions?: number
          receiver_id?: string
          sender_id?: string
          sender_name?: string
          status?: string
          subject?: string
          total_questions?: number
        }
        Relationships: []
      }
      duel_lobbies: {
        Row: {
          custom_topic: string
          exam: string
          guest_consecutive_wrong: number
          guest_id: string
          guest_index: number
          guest_name: string
          guest_score: number
          host_consecutive_wrong: number
          host_id: string
          host_index: number
          host_name: string
          host_score: number
          last_update: string
          lobby_id: string
          num_questions: number
          questions: Json
          rope_position: number
          status: string
          subject: string
          winner_id: string | null
        }
        Insert: {
          custom_topic?: string
          exam?: string
          guest_consecutive_wrong?: number
          guest_id: string
          guest_index?: number
          guest_name?: string
          guest_score?: number
          host_consecutive_wrong?: number
          host_id: string
          host_index?: number
          host_name: string
          host_score?: number
          last_update?: string
          lobby_id: string
          num_questions?: number
          questions?: Json
          rope_position?: number
          status?: string
          subject?: string
          winner_id?: string | null
        }
        Update: {
          custom_topic?: string
          exam?: string
          guest_consecutive_wrong?: number
          guest_id?: string
          guest_index?: number
          guest_name?: string
          guest_score?: number
          host_consecutive_wrong?: number
          host_id?: string
          host_index?: number
          host_name?: string
          host_score?: number
          last_update?: string
          lobby_id?: string
          num_questions?: number
          questions?: Json
          rope_position?: number
          status?: string
          subject?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          accuracy: number
          created_at: string
          exam: string
          id: string
          mode: string
          name: string
          score: number
          streak: number
          user_id: string
        }
        Insert: {
          accuracy?: number
          created_at?: string
          exam?: string
          id?: string
          mode?: string
          name: string
          score?: number
          streak?: number
          user_id: string
        }
        Update: {
          accuracy?: number
          created_at?: string
          exam?: string
          id?: string
          mode?: string
          name?: string
          score?: number
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      online_presence: {
        Row: {
          last_active: string
          name: string
          rank: string
          score: number
          user_id: string
        }
        Insert: {
          last_active?: string
          name: string
          rank?: string
          score?: number
          user_id: string
        }
        Update: {
          last_active?: string
          name?: string
          rank?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          rank: string
          score: number
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          rank?: string
          score?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          rank?: string
          score?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
