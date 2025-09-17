import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/supabase";

// The User type is now simplified and does not include the password
// to avoid exposing sensitive data on the client.
type User = {
  id: string;
  name: string;
  address: string;
  username: string;
  email: string;
  phoneNumber: string;
  profileImage: string | null;
  role: string;
};

type AuthCtx = {
  user: User | null;
  // Updated to use email instead of username
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

// This helper function now explicitly omits the password field.
function mapDbUser(
  dbUser: Database["public"]["Tables"]["users"]["Row"]
): User {
  return {
    id: dbUser.id,
    name: dbUser.name,
    address: dbUser.address,
    username: dbUser.username,
    // The password field is not included here.
    email: dbUser.email,
    phoneNumber: dbUser.phone_number,
    profileImage: dbUser.profile_image ?? null,
    role: dbUser.role,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize user from localStorage if available, otherwise null
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  
  // Only show loading if we have no user at all (cached or otherwise)
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      return !savedUser; // Only load if no cached user exists
    } catch {
      return true; // Load if localStorage is broken
    }
  });

  // This useEffect hook is responsible for fetching the user profile data
  // from our 'users' table using the session data from Supabase.
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component
    
    const loadAndSetUser = async (session: any) => {
      if (session?.user?.id) {
        // Use the auth user ID directly to get profile
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (data && isMounted) {
          const mappedUser = mapDbUser(data);
          setUser(mappedUser);
          // Persist user to localStorage for optimistic loading
          localStorage.setItem('currentUser', JSON.stringify(mappedUser));
        }
      } else if (isMounted) {
        setUser(null);
        // Clear user from localStorage when signed out
        localStorage.removeItem('currentUser');
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    // Load user on initial render
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Only show loading if we don't have a cached user and there's a session
      if (!user && session) {
        setIsLoading(true);
      }
      loadAndSetUser(session);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadAndSetUser(session);
    });

    // Unsubscribe from the listener on component unmount
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<User> => {
    // Real Supabase authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("Supabase sign-in error:", authError);
      throw new Error("Invalid email or password");
    }

    if (!authData.user) {
      throw new Error("No user data returned");
    }

    // Load the profile using the auth user ID
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to load user profile:", profileError);
      throw new Error("Failed to load user profile");
    }

    const mapped = mapDbUser(profile);
    setUser(mapped);
    // Persist user to localStorage for optimistic loading
    localStorage.setItem('currentUser', JSON.stringify(mapped));
    return mapped;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // Clear user from localStorage when logging out
    localStorage.removeItem('currentUser');
    // The user state will be updated by the onAuthStateChange listener.
    // Setting it here is redundant but can be a good fallback.
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, login, logout, isLoading }}>{children}</Ctx.Provider>
  );
}

// The useAuth hook remains the same.
export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within an AuthProvider");
  return c;
}