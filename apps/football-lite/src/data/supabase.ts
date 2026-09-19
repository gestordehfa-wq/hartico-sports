import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FootballTable, MutationValue } from "../domain/model";

type FootballDatabase = {
  football: {
    Tables: Record<
      FootballTable,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, MutationValue>;
        Update: Record<string, MutationValue>;
        Relationships: [];
      }
    >;
    Views: Record<string, never>;
    Functions: {
      current_user_is_admin: { Args: Record<string, never>; Returns: boolean };
      advance_knockout_winner: {
        Args: {
          target_match_id: string;
          p_tiebreak_winner_id: string | null;
          p_tiebreak_note: string | null;
        };
        Returns: undefined;
      };
      close_league: {
        Args: {
          target_competition_id: string;
          p_champion_team_id: string | null;
          p_note: string | null;
        };
        Returns: undefined;
      };
      generate_supercup: {
        Args: {
          target_competition_id: string;
          p_league_id: string;
          p_cup_id: string;
          p_scheduled_at: string;
          p_opponent_team_id: string | null;
        };
        Returns: undefined;
      };
    };
  };
};

export type FootballSupabaseClient = SupabaseClient<FootballDatabase, "football">;
const url = import.meta.env.VITE_FOOTBALL_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_FOOTBALL_SUPABASE_ANON_KEY?.trim();
export const databaseConfigured = Boolean(url && publishableKey);

export const supabase: FootballSupabaseClient | null =
  url && publishableKey
    ? createClient<FootballDatabase, "football">(url, publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        db: { schema: "football" },
      })
    : null;
