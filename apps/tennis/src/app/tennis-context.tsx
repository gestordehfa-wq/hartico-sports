import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SupabaseTennisRepository, type TennisRepository } from "../data/repository";
import { databaseConfigured, supabase } from "../data/supabase";
import { emptySnapshot, type TennisSnapshot } from "../domain/model";

type TennisContextValue = Readonly<{
  snapshot: TennisSnapshot;
  loading: boolean;
  error: string | null;
  configured: boolean;
  session: Session | null;
  isAdmin: boolean;
  adminChecked: boolean;
  repository: TennisRepository | null;
  refresh(): Promise<void>;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
}>;
const TennisContext = createContext<TennisContextValue | null>(null);
export function TennisProvider({ children }: Readonly<{ children: ReactNode }>) {
  const repository = useMemo(() => (supabase ? new SupabaseTennisRepository(supabase) : null), []);
  const [snapshot, setSnapshot] = useState<TennisSnapshot>(emptySnapshot);
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
      setError(cause instanceof Error ? cause.message : "No fue posible cargar Tennis.");
    } finally {
      setLoading(false);
    }
  }, [repository]);
  useEffect(() => {
    void refresh();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
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
    if (!supabase) return "Supabase Cloud no está configurado.";
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
    <TennisContext.Provider
      value={{
        snapshot,
        loading,
        error,
        configured: databaseConfigured,
        session,
        isAdmin,
        adminChecked,
        repository,
        refresh,
        signIn,
        signOut,
      }}
    >
      {children}
    </TennisContext.Provider>
  );
}
export function useTennis(): TennisContextValue {
  const context = useContext(TennisContext);
  if (!context) throw new Error("useTennis debe usarse dentro de TennisProvider.");
  return context;
}
