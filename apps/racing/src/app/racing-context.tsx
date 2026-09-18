import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { databaseConfigured, supabase } from "../data/supabase";
import { SupabaseRacingRepository, type RacingRepository } from "../data/repository";
import { emptySnapshot, type RacingSnapshot } from "../domain/model";

type RacingContextValue = Readonly<{
  snapshot: RacingSnapshot;
  loading: boolean;
  error: string | null;
  configured: boolean;
  session: Session | null;
  isAdmin: boolean;
  adminChecked: boolean;
  repository: RacingRepository | null;
  refresh(): Promise<void>;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
}>;

const RacingContext = createContext<RacingContextValue | null>(null);

export function RacingProvider({ children }: Readonly<{ children: ReactNode }>) {
  const repository = useMemo(() => (supabase ? new SupabaseRacingRepository(supabase) : null), []);
  const [snapshot, setSnapshot] = useState<RacingSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(databaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  const refresh = useCallback(async () => {
    if (!repository) return;
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await repository.load());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar Racing.");
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void refresh();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    setAdminChecked(false);
    if (!supabase || !session) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }
    void supabase.rpc("current_user_is_admin").then(({ data, error: rpcError }) => {
      setIsAdmin(!rpcError && data === true);
      setAdminChecked(true);
    });
  }, [session]);

  async function signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return "Supabase local no está configurado.";
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return authError.message;
    await refresh();
    return null;
  }

  async function signOut(): Promise<void> {
    await supabase?.auth.signOut();
    await refresh();
  }

  return (
    <RacingContext.Provider value={{ snapshot, loading, error, configured: databaseConfigured, session, isAdmin, adminChecked, repository, refresh, signIn, signOut }}>
      {children}
    </RacingContext.Provider>
  );
}

export function useRacing(): RacingContextValue {
  const context = useContext(RacingContext);
  if (!context) throw new Error("useRacing debe usarse dentro de RacingProvider.");
  return context;
}
