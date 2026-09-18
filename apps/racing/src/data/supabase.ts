import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MutationValue, RacingTable } from "../domain/model";

type RacingDatabase = {
  public: {
    Tables: Record<RacingTable, {
      Row: Record<string, unknown>;
      Insert: Record<string, MutationValue>;
      Update: Record<string, MutationValue>;
      Relationships: [];
    }>;
    Views: Record<string, never>;
    Functions: {
      current_user_is_admin: { Args: Record<string, never>; Returns: boolean };
    };
  };
};

export type RacingSupabaseClient = SupabaseClient<RacingDatabase>;

const url = import.meta.env.VITE_RACING_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_RACING_SUPABASE_PUBLISHABLE_KEY?.trim();

export const databaseConfigured = Boolean(url && publishableKey);

export const supabase: RacingSupabaseClient | null =
  url && publishableKey
    ? createClient<RacingDatabase>(url, publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
