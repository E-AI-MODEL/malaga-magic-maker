import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

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
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Legacy username→email map for backwards compatibility
const USERNAME_EMAIL_MAP: Record<string, string> = {
  robin: "robin@local.app",
  mark: "mark@local.app",
  dimitri: "dimitri@local.app",
  edwin: "edwin@local.app",
  admin: "admin@local.app",
  pieter: "pieter@local.app",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    setIsAdmin(roleData?.some((r: any) => r.role === "admin") ?? false);
  };

  useEffect(() => {
    // Always set up the auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    // Force logout for existing sessions to ensure users see boot sequence
    const AUTH_VERSION = "v2-boot";
    if (localStorage.getItem("auth-version") !== AUTH_VERSION) {
      localStorage.setItem("auth-version", AUTH_VERSION);
      sessionStorage.removeItem("boot-shown");
      supabase.auth.signOut(); // listener will handle state update
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        }
        setLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (emailOrUsername: string, password: string) => {
    // Support both legacy usernames and email login
    let email = emailOrUsername;
    if (!emailOrUsername.includes("@")) {
      const mapped = USERNAME_EMAIL_MAP[emailOrUsername.toLowerCase()];
      if (mapped) {
        email = mapped;
      } else {
        return { error: "Onbekende gebruiker" };
      }
    }

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: "Verkeerd e-mailadres of wachtwoord" };
    }
    if (data.user) {
      supabase.from("activity_log").insert({
        user_id: data.user.id,
        event_type: "login",
        page: "/login",
      }).then(() => {});
    }
    return {};
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const username = displayName.toLowerCase().replace(/\s+/g, "");
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      if (error.message.includes("already registered")) {
        return { error: "Dit e-mailadres is al geregistreerd" };
      }
      return { error: error.message };
    }
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
