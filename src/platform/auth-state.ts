import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
export const AuthContext = createContext<{
  session: Session | null;
  ready: boolean;
  admin: boolean;
}>({ session: null, ready: false, admin: false });
export const useAuth = () => useContext(AuthContext);
