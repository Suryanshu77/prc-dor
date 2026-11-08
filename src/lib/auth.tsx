import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const PASSWORD_RESET_PATH = "/reset-password";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  /** True once Supabase has delivered a PASSWORD_RECOVERY sign-in. */
  passwordRecovery: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  passwordRecovery: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const recoveryRedirectDone = useRef(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      } else if (event === "SIGNED_OUT") {
        setPasswordRecovery(false);
        recoveryRedirectDone.current = false;
      }
      if (s?.user) {
        setTimeout(() => {
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id)
            .then(({ data }) => {
              setIsAdmin((data ?? []).some((r) => r.role === "admin"));
            });
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .then(({ data: roles }) => {
            setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
          });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Recovery links can land anywhere if the Supabase redirect URL isn't
  // allow-listed yet; always route a recovery sign-in to the reset page so the
  // user picks a new password instead of being sent to the dashboard.
  useEffect(() => {
    if (!passwordRecovery || recoveryRedirectDone.current) return;
    if (pathname === PASSWORD_RESET_PATH) {
      recoveryRedirectDone.current = true;
      return;
    }
    recoveryRedirectDone.current = true;
    void router.navigate({ to: PASSWORD_RESET_PATH });
  }, [passwordRecovery, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        isAdmin,
        loading,
        passwordRecovery,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
