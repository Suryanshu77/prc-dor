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
      hall_of_fame: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          total_points: number | null
          winner_id: string | null
          winner_image: string | null
          winner_name: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          total_points?: number | null
          winner_id?: string | null
          winner_image?: string | null
          winner_name: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          total_points?: number | null
          winner_id?: string | null
          winner_image?: string | null
          winner_name?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hall_of_fame_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "player_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hall_of_fame_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          jersey_number: number | null
          nickname: string | null
          position: Database["public"]["Enums"]["player_position"] | null
          profile_image: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          jersey_number?: number | null
          nickname?: string | null
          position?: Database["public"]["Enums"]["player_position"] | null
          profile_image?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          jersey_number?: number | null
          nickname?: string | null
          position?: Database["public"]["Enums"]["player_position"] | null
          profile_image?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          points: number
          rank_position: number
          ranked_player_id: string
          voter_id: string
          voting_period_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          rank_position: number
          ranked_player_id: string
          voter_id: string
          voting_period_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          rank_position?: number
          ranked_player_id?: string
          voter_id?: string
          voting_period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_ranked_player_id_fkey"
            columns: ["ranked_player_id"]
            isOneToOne: false
            referencedRelation: "player_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_ranked_player_id_fkey"
            columns: ["ranked_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voting_period_id_fkey"
            columns: ["voting_period_id"]
            isOneToOne: false
            referencedRelation: "voting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_periods: {
        Row: {
          announcement: string | null
          banner_url: string | null
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          results_published: boolean
          starts_at: string | null 
          title: string
          winner_id: string | null
          year: number
        }
        Insert: {
          announcement?: string | null
          banner_url?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          results_published?: boolean
          starts_at?: string | null
          title?: string
          winner_id?: string | null
          year: number
        }
        Update: {
          announcement?: string | null
          banner_url?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          results_published?: boolean
          starts_at?: string | null
          title?: string
          winner_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "voting_periods_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "player_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voting_periods_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      player_results: {
        Row: {
          first_place_votes: number | null
          full_name: string | null
          id: string | null
          jersey_number: number | null
          nickname: string | null
          position: Database["public"]["Enums"]["player_position"] | null
          profile_image: string | null
          total_points: number | null
          total_rankings: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_player_emails: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
      get_period_vote_stats: {
        Args: { _period_id?: string }
        Returns: {
          vote_count: number
          voter_count: number
        }[]
      }
      has_voted_in_period: { Args: { _period_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      player_position:
        | "Goalkeeper"
        | "Defender"
        | "Midfielder"
        | "Winger"
        | "Striker"
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
      app_role: ["admin", "user"],
      player_position: [
        "Goalkeeper",
        "Defender",
        "Midfielder",
        "Winger",
        "Striker",
      ],
    },
  },
} as const
