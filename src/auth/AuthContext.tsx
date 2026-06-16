import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Profile, UserRole } from "../types";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type AuthContextValue = {
  isLoading: boolean;
  isConfigured: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
};

type SignInInput = {
  email: string;
  password: string;
  devName?: string;
};

type SignUpInput = SignInInput & {
  fullName: string;
};

const devProfileStorageKey = "recycleGroupSafetyHubDevProfile";
const demoAdminUsername = "admin";
const demoAdminPassword = "admin";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const storedDemoProfile = loadStoredDemoProfile();

      if (storedDemoProfile) {
        if (isMounted) {
          setProfile(storedDemoProfile);
          setIsLoading(false);
        }

        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        const storedProfile = window.localStorage.getItem(devProfileStorageKey);

        if (storedProfile && isMounted) {
          setProfile(JSON.parse(storedProfile) as Profile);
        }

        if (isMounted) {
          setIsLoading(false);
        }

        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(data.session);

      if (data.session?.user) {
        setProfile(await loadProfile(data.session.user.id, data.session.user.email));
      }

      setIsLoading(false);
    }

    init();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user) {
        setProfile(await loadProfile(nextSession.user.id, nextSession.user.email));
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(input: SignInInput) {
    if (isDemoAdminLogin(input)) {
      const demoProfile = {
        id: "local-demo-admin",
        fullName: "Admin User",
        role: "admin" as UserRole,
        isActive: true,
        email: "admin",
      };

      window.localStorage.setItem(devProfileStorageKey, JSON.stringify(demoProfile));
      setSession(null);
      setProfile(demoProfile);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      const devProfile = {
        id: "local-dev-user",
        fullName: input.devName?.trim() || input.email.trim() || "Test Operator",
        role: "admin" as UserRole,
        isActive: true,
        email: input.email,
      };

      window.localStorage.setItem(devProfileStorageKey, JSON.stringify(devProfile));
      setProfile(devProfile);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw error;
    }
  }

  async function signUp(input: SignUpInput) {
    if (!isSupabaseConfigured || !supabase) {
      await signIn({ email: input.email, password: input.password, devName: input.fullName });
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          role: "operator",
        },
      },
    });

    if (error) {
      throw error;
    }
  }

  async function signOut() {
    if (!isSupabaseConfigured || !supabase) {
      window.localStorage.removeItem(devProfileStorageKey);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  const value = useMemo(
    () => ({
      isLoading,
      isConfigured: isSupabaseConfigured,
      session,
      profile,
      signIn,
      signUp,
      signOut,
    }),
    [isLoading, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}

export function useAuthSubmit(
  mode: "sign-in" | "sign-up",
  setError: (message: string) => void,
) {
  const auth = useAuth();

  return async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "");

    try {
      if (mode === "sign-up") {
        await auth.signUp({ email, password, fullName });
      } else {
        await auth.signIn({ email, password, devName: fullName });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed.");
    }
  };
}

function isDemoAdminLogin(input: SignInInput) {
  return (
    input.email.trim().toLowerCase() === demoAdminUsername &&
    input.password === demoAdminPassword
  );
}

function loadStoredDemoProfile() {
  const storedProfile = window.localStorage.getItem(devProfileStorageKey);

  if (!storedProfile) {
    return null;
  }

  try {
    const parsedProfile = JSON.parse(storedProfile) as Profile;
    return parsedProfile.id.startsWith("local-") ? parsedProfile : null;
  } catch {
    window.localStorage.removeItem(devProfileStorageKey);
    return null;
  }
}

async function loadProfile(userId: string, email?: string): Promise<Profile> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,role,is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { data: userData } = await supabase.auth.getUser();
    const fullName =
      String(userData.user?.user_metadata?.full_name ?? "").trim() ||
      email ||
      "Operator";

    const fallbackProfile = {
      id: userId,
      full_name: fullName,
      role: "operator",
      is_active: true,
    };

    await supabase.from("profiles").upsert(fallbackProfile);

    return {
      id: userId,
      fullName,
      role: "operator",
      isActive: true,
      email,
    };
  }

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    isActive: data.is_active,
    email,
  };
}
