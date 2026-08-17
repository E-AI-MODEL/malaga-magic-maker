import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

const ADMIN_USER_ID = "638d717f-4943-4993-9b79-b9a79f6f69ec";
const ADMIN_EMAIL = "admin@local.app";

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

    const hasAdminRole = roleData?.some((r: { role: string }) => r.role === "admin") ?? false;
    if (!hasAdminRole) {
      clearAuthState();
      await supabase.auth.signOut();
      return false;
    }

    if (profileData) setProfile(profileData);
    setIsAdmin(true);
    return true;
  };

  useEffect(() => {
    let active = true;

    const enforceAdminSession = async (session: Session | null) => {
      if (!active) return;

      if (!session?.user) {
        clearAuthState();
        setLoading(false);
        return;
      }

      const email = session.user.email?.toLowerCase();
      if (session.user.id !== ADMIN_USER_ID || email !== ADMIN_EMAIL) {
        clearAuthState();
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setUser(session.user);
      const allowed = await fetchProfile(session.user.id);
      if (!active) return;
      if (!allowed) clearAuthState();
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void enforceAdminSession(session), 0);
    });

    const AUTH_VERSION = "v3-admin-only";
    if (localStorage.getItem("auth-version") !== AUTH_VERSION) {
      localStorage.setItem("auth-version", AUTH_VERSION);
      sessionStorage.removeItem("boot-shown");
      supabase.auth.signOut().finally(() => {
        if (active) setLoading(false);
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        void enforceAdminSession(session);
      });
    }

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (emailOrUsername: string, password: string) => {
    const login = emailOrUsername.trim().toLowerCase();
    if (login !== "admin" && login !== ADMIN_EMAIL) {
      return { error: "Geen toegang" };
    }

    const { error, data } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password,
    });

    if (error) {
      return { error: "Verkeerd e-mailadres of wachtwoord" };
    }

    if (!data.user || data.user.id !== ADMIN_USER_ID || data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      clearAuthState();
      return { error: "Geen toegang" };
    }

    const allowed = await fetchProfile(data.user.id);
    if (!allowed) {
      return { error: "Geen toegang" };
    }

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

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
