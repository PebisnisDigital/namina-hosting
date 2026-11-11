import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { configured, rpc, supabase } from "./client";
import { AuthContext } from "./auth-state";
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!configured);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setReady(true);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      setSession(value);
      setAdmin(false);
      setReady(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let current = true;
    setAdmin(false);
    if (session)
      void rpc<boolean>("is_admin")
        .then((value) => {
          if (current) setAdmin(value);
        })
        .catch(() => setAdmin(false));
    return () => {
      current = false;
    };
  }, [session]);
  return (
    <AuthContext.Provider value={{ session, ready, admin }}>
      {children}
    </AuthContext.Provider>
  );
}
