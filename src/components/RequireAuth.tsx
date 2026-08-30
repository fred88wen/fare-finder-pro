import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

const AuthedUserContext = createContext<User | null>(null);

/** The signed-in user inside a <RequireAuth> subtree. */
export function useAuthedUser(): User {
  const user = useContext(AuthedUserContext);
  if (!user) throw new Error("useAuthedUser must be used inside <RequireAuth>");
  return user;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<{ status: "loading" | "done"; user: User | null }>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setState({ status: "done", user: error ? null : (data.user ?? null) });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({ status: "done", user: session?.user ?? null });
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (state.status === "loading") {
    return <div className="min-h-screen bg-background" />;
  }

  if (!state.user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return <AuthedUserContext.Provider value={state.user}>{children}</AuthedUserContext.Provider>;
}
