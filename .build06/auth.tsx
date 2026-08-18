import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import {
  INVITE_SIGNUP_ENABLED,
  isPrelaunchAllowedUser,
  PRELAUNCH_ACCESS_RESTRICTED,
  PRELAUNCH_AUTH_VERSION,
  PUBLIC_SIGNUP_ENABLED,
} from "@/config/access";

const ADMIN_EMAIL = "admin@local.app";

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

interface AuthResult {
  error?: string;
}

interface SignUpResult extends AuthResult {
  needsEmailConfirmation?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const fetchProfile = async (userId: string) => {
    const [{ data: profileData }, { data: roleData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    setProfile(profileData || null);
    setIsAdmin(roleData?.some((role: { role: string }) => role.role === "admin") ?? false);
  };

  useEffect(() => {
    let active = true;

    const enforceSession = async (session: Session | null) => {
      if (!active) return;
      if (!session?.user) {
        clearAuthState();
        setLoading(false);
        return;
      }

      if (!isPrelaunchAllowedUser(session.user)) {
        clearAuthState();
        await supabase.auth.signOut();
        if (active) setLoading(false);
        return;
      }

      setUser(session.user);
      await fetchProfile(session.user.id);
      if (active) setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void enforceSession(session), 0);
    });

    if (localStorage.getItem("auth-version") !== PRELAUNCH_AUTH_VERSION) {
      localStorage.setItem("auth-version", PRELAUNCH_AUTH_VERSION);
      sessionStorage.removeItem("boot-shown");
      supabase.auth.signOut().finally(() => {
        if (active) setLoading(false);
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        void enforceSession(session);
      });
    }

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (emailOrUsername: string, password: string): Promise<AuthResult> => {
    const login = emailOrUsername.trim().toLowerCase();
    const email = login === "admin" ? ADMIN_EMAIL : login;

    if (PRELAUNCH_ACCESS_RESTRICTED && email !== ADMIN_EMAIL) {
      return { error: "Geen toegang" };
    }

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Verkeerd e-mailadres of wachtwoord" };

    if (!data.user || !isPrelaunchAllowedUser(data.user)) {
      await supabase.auth.signOut();
      clearAuthState();
      return { error: "Geen toegang" };
    }

    setUser(data.user);
    await fetchProfile(data.user.id);

    void supabase.from("activity_log").insert({
      user_id: data.user.id,
      event_type: "login",
      page: "/login",
    });

    return {};
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<SignUpResult> => {
    if (PRELAUNCH_ACCESS_RESTRICTED || (!PUBLIC_SIGNUP_ENABLED && !INVITE_SIGNUP_ENABLED)) {
      return { error: "Nieuwe accounts zijn nog niet geopend." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (error) {
      return { error: "Account maken is niet gelukt. Controleer je gegevens en probeer opnieuw." };
    }

    return { needsEmailConfirmation: !data.session };
  };

  const requestPasswordReset = async (email: string): Promise<AuthResult> => {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (error) return { error: "De herstellink kon niet worden aangevraagd." };
    return {};
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: "Het nieuwe wachtwoord kon niet worden opgeslagen." };
    return {};
  };

  const signOut = async () => {
    clearAuthState();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signIn, signUp, requestPasswordReset, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
