export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          read_at?: string | null;
          title: string;
          type?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      hall_of_fame: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          total_points: number | null;
          winner_id: string | null;
          winner_image: string | null;
          winner_name: string;
          year: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          total_points?: number | null;
          winner_id?: string | null;
          winner_image?: string | null;
          winner_name: string;
          year: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          total_points?: number | null;
          winner_id?: string | null;
          winner_image?: string | null;
          winner_name?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "hall_of_fame_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "player_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hall_of_fame_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          age: number | null;
          bio: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          jersey_number: number | null;
          nickname: string | null;
          position: Database["public"]["Enums"]["player_position"] | null;
          profile_image: string | null;
          social_handle: string | null;
          updated_at: string;
        };
        Insert: {
          age?: number | null;
          bio?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id: string;
          jersey_number?: number | null;
          nickname?: string | null;
          position?: Database["public"]["Enums"]["player_position"] | null;
          profile_image?: string | null;
          social_handle?: string | null;
          updated_at?: string;
        };
        Update: {
          age?: number | null;
          bio?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          jersey_number?: number | null;
          nickname?: string | null;
          position?: Database["public"]["Enums"]["player_position"] | null;
          profile_image?: string | null;
          social_handle?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      special_award_candidates: {
        Row: {
          award_id: string;
          created_at: string;
          id: string;
          player_id: string;
        };
        Insert: {
          award_id: string;
          created_at?: string;
          id?: string;
          player_id: string;
        };
        Update: {
          award_id?: string;
          created_at?: string;
          id?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "special_award_candidates_award_id_fkey";
            columns: ["award_id"];
            isOneToOne: false;
            referencedRelation: "special_awards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "special_award_candidates_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      special_awards: {
        Row: {
          award_key: string;
          created_at: string;
          description: string | null;
          eligibility_max_age: number | null;
          eligibility_position:
            Database["public"]["Enums"]["player_position"] | null;
          eligibility_type: string;
          id: string;
          results_visible: boolean;
          title: string;
          updated_at: string;
          voting_open: boolean;
          voting_period_id: string;
        };
        Insert: {
          award_key: string;
          created_at?: string;
          description?: string | null;
          eligibility_max_age?: number | null;
          eligibility_position?:
            Database["public"]["Enums"]["player_position"] | null;
          eligibility_type?: string;
          id?: string;
          results_visible?: boolean;
          title: string;
          updated_at?: string;
          voting_open?: boolean;
          voting_period_id: string;
        };
        Update: {
          award_key?: string;
          created_at?: string;
          description?: string | null;
          eligibility_max_age?: number | null;
          eligibility_position?:
            Database["public"]["Enums"]["player_position"] | null;
          eligibility_type?: string;
          id?: string;
          results_visible?: boolean;
          title?: string;
          updated_at?: string;
          voting_open?: boolean;
          voting_period_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "special_awards_voting_period_id_fkey";
            columns: ["voting_period_id"];
            isOneToOne: false;
            referencedRelation: "voting_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      special_votes: {
        Row: {
          award_id: string;
          candidate_id: string;
          created_at: string;
          id: string;
          points: number;
          rank_position: number;
          voter_id: string;
        };
        Insert: {
          award_id: string;
          candidate_id: string;
          created_at?: string;
          id?: string;
          points: number;
          rank_position: number;
          voter_id: string;
        };
        Update: {
          award_id?: string;
          candidate_id?: string;
          created_at?: string;
          id?: string;
          points?: number;
          rank_position?: number;
          voter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "special_votes_award_id_fkey";
            columns: ["award_id"];
            isOneToOne: false;
            referencedRelation: "special_awards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "special_votes_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "special_award_candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          created_at: string;
          id: string;
          points: number;
          rank_position: number;
          ranked_player_id: string;
          voter_id: string;
          voting_period_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          points: number;
          rank_position: number;
          ranked_player_id: string;
          voter_id: string;
          voting_period_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          points?: number;
          rank_position?: number;
          ranked_player_id?: string;
          voter_id?: string;
          voting_period_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_ranked_player_id_fkey";
            columns: ["ranked_player_id"];
            isOneToOne: false;
            referencedRelation: "player_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_ranked_player_id_fkey";
            columns: ["ranked_player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_voting_period_id_fkey";
            columns: ["voting_period_id"];
            isOneToOne: false;
            referencedRelation: "voting_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      voting_periods: {
        Row: {
          announcement: string | null;
          banner_url: string | null;
          created_at: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          results_published: boolean;
          results_visible: boolean;
          starts_at: string | null;
          title: string;
          winner_id: string | null;
          year: number;
        };
        Insert: {
          announcement?: string | null;
          banner_url?: string | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          results_published?: boolean;
          results_visible?: boolean;
          starts_at?: string | null;
          title?: string;
          winner_id?: string | null;
          year: number;
        };
        Update: {
          announcement?: string | null;
          banner_url?: string | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          results_published?: boolean;
          results_visible?: boolean;
          starts_at?: string | null;
          title?: string;
          winner_id?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "voting_periods_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "player_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "voting_periods_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      player_results: {
        Row: {
          first_place_votes: number | null;
          full_name: string | null;
          id: string | null;
          jersey_number: number | null;
          nickname: string | null;
          position: Database["public"]["Enums"]["player_position"] | null;
          profile_image: string | null;
          total_points: number | null;
          total_rankings: number | null;
        };
        Relationships: [];
      };
      player_results_by_period: {
        Row: {
          first_place_votes: number | null;
          full_name: string | null;
          id: string | null;
          jersey_number: number | null;
          nickname: string | null;
          position: Database["public"]["Enums"]["player_position"] | null;
          profile_image: string | null;
          total_points: number | null;
          total_rankings: number | null;
          voting_period_id: string | null;
          year: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "player_results_by_period_voting_period_id_fkey";
            columns: ["voting_period_id"];
            isOneToOne: false;
            referencedRelation: "voting_periods";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      admin_create_special_award_edition: {
        Args: { _year: number; _ends_at?: string };
        Returns: {
          award_key: string;
          award_id: string;
          period_id: string;
        }[];
      };
      admin_list_player_emails: {
        Args: never;
        Returns: {
          email: string;
          id: string;
        }[];
      };
      admin_nominate_player: {
        Args: { _award_id: string; _player_id: string };
        Returns: string;
      };
      admin_remove_nominee: {
        Args: { _award_id: string; _player_id: string };
        Returns: undefined;
      };
      admin_reset_special_votes: {
        Args: { _award_id: string };
        Returns: undefined;
      };
      admin_set_special_award_eligibility: {
        Args: {
          _award_id: string;
          _eligibility_type: string;
          _max_age?: number;
          _position?: Database["public"]["Enums"]["player_position"];
        };
        Returns: undefined;
      };
      admin_set_special_award_status: {
        Args: {
          _award_id: string;
          _voting_open: boolean;
          _results_visible: boolean;
        };
        Returns: undefined;
      };
      get_active_period_analytics: {
        Args: never;
        Returns: {
          id: string;
          full_name: string;
          nickname: string | null;
          position: Database["public"]["Enums"]["player_position"] | null;
          jersey_number: number | null;
          profile_image: string | null;
          total_points: number;
          first_place_votes: number;
          total_rankings: number;
        }[];
      };
      get_period_results: {
        Args: { _period_id: string };
        Returns: {
          voting_period_id: string;
          year: number;
          id: string;
          full_name: string;
          nickname: string | null;
          position: Database["public"]["Enums"]["player_position"] | null;
          jersey_number: number | null;
          profile_image: string | null;
          total_points: number;
          first_place_votes: number;
          total_rankings: number;
        }[];
      };
      get_period_vote_stats: {
        Args: { _period_id?: string };
        Returns: {
          vote_count: number;
          voter_count: number;
        }[];
      };
      get_player_period_rank: {
        Args: { _player_id: string; _period_id: string };
        Returns: {
          rank: number;
          total_points: number;
          first_place_votes: number;
          total_rankings: number;
        }[];
      };
      get_special_award_results: {
        Args: { _award_id: string };
        Returns: {
          award_id: string;
          candidate_id: string;
          id: string;
          full_name: string;
          nickname: string | null;
          player_position:
            Database["public"]["Enums"]["player_position"] | null;
          jersey_number: number | null;
          profile_image: string | null;
          total_points: number;
          first_place_votes: number;
          total_rankings: number;
        }[];
      };
      get_special_award_stats: {
        Args: { _award_id: string };
        Returns: {
          vote_count: number;
          voter_count: number;
        }[];
      };
      has_voted_in_period: { Args: { _period_id: string }; Returns: boolean };
      is_period_results_visible: {
        Args: { _period_id: string };
        Returns: boolean;
      };
      is_special_award_results_visible: {
        Args: { _award_id: string };
        Returns: boolean;
      };
      submit_main_ballot: {
        Args: { _period_id: string; _player_ids: string[] };
        Returns: undefined;
      };
      submit_special_ballot: {
        Args: { _award_id: string; _ranked_candidate_ids: string[] };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      player_position:
        "Goalkeeper" | "Defender" | "Midfielder" | "Winger" | "Striker";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

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
} as const;
