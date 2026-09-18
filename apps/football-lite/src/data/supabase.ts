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
    Functions: { current_user_is_admin: { Args: Record<string, never>; Returns: boolean } };
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
