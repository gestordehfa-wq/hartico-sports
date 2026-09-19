import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MutationValue, TennisTable } from "../domain/model";

type TennisDatabase = {
  tennis: {
    Tables: Record<
      TennisTable,
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
      confirm_match_result: { Args: { target_match_id: string }; Returns: undefined };
      generate_tournament_draw: { Args: { target_edition_id: string }; Returns: undefined };
      record_match_point: {
        Args: { target_match_id: string; scorer_slot: number };
        Returns: undefined;
      };
      set_match_score: {
        Args: {
          target_match_id: string;
          p1_games: number;
          p2_games: number;
          p1_points: number;
          p2_points: number;
          confirm_result: boolean;
        };
        Returns: undefined;
      };
    };
  };
};
export type TennisSupabaseClient = SupabaseClient<TennisDatabase, "tennis">;
const url = import.meta.env.VITE_TENNIS_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_TENNIS_SUPABASE_ANON_KEY?.trim();
export const databaseConfigured = Boolean(url && publishableKey);
export const supabase: TennisSupabaseClient | null =
  url && publishableKey
    ? createClient<TennisDatabase, "tennis">(url, publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        db: { schema: "tennis" },
      })
    : null;
