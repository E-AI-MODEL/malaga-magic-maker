import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { PRELAUNCH_ACCESS_RESTRICTED, PRELAUNCH_AUTH_VERSION } from "@/config/access";

// Temporary pre-launch allowlist. This is access control for the private build,
// not the long-term product role model. BUILD 06 replaces this gate safely.
const PRELAUNCH_USER_ID = "638d717f-4943-4993-9b79-b9a79f6f69ec";
const PRELAUNCH_EMAIL = "admin@local.app";

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
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

    if (profileData) setProfile(profileData);
    setIsAdmin(roleData?.some((role: { role: string }) => role.role === "admin") ?? false);
  };

  const isAllowedDuringPrelaunch = (candidate: User) => {
    if (!PRELAUNCH_ACCESS_RESTRICTED) return true;
    return candidate.id === PRELAUNCH_USER_ID && candidate.email?.toLowerCase() === PRELAUNCH_EMAIL;
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

      if (!isAllowedDuringPrelaunch(session.user)) {
        clearAuthState();
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setUser(session.user);
      await fetchProfile(session.user.id);
      if (active) setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void enforceSession(session), 0);
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

  const signIn = async (emailOrUsername: string, password: string) => {
    const login = emailOrUsername.trim().toLowerCase();
    let email = login;

    if (PRELAUNCH_ACCESS_RESTRICTED) {
      if (login !== "admin" && login !== PRELAUNCH_EMAIL) {
        return { error: "Geen toegang" };
      }
      email = PRELAUNCH_EMAIL;
    } else if (!login.includes("@")) {
      return { error: "Gebruik je e-mailadres" };
    }

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: "Verkeerd e-mailadres of wachtwoord" };
    }

    if (!data.user || !isAllowedDuringPrelaunch(data.user)) {
      await supabase.auth.signOut();
      clearAuthState();
      return { error: "Geen toegang" };
    }

    setUser(data.user);
    await fetchProfile(data.user.id);

    supabase
      .from("activity_log")
      .insert({
        user_id: data.user.id,
        event_type: "login",
        page: "/login",
      })
      .then(() => {});

    return {};
  };

  const signOut = async () => {
    clearAuthState();
    await supabase.auth.signOut();
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: displayName.trim() },
      },
    });

    if (error) return { error: "Account maken is niet gelukt." };
    if (!data.session) return { needsEmailConfirmation: true };

    if (data.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
    }
    return {};
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: "Herstelmail versturen is niet gelukt." };
    return {};
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: "Wachtwoord opslaan is niet gelukt." };
    return {};
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, isAdmin, loading, signIn, signUp, requestPasswordReset, updatePassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
