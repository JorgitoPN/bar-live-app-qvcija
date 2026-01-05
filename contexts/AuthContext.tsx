
/**
 * Authentication Context Template
 * ✅ OPTIMIZED: Prevent "Maximum update depth exceeded" errors
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from "react";
import { Platform } from "react-native";
import { authClient, storeWebBearerToken } from "@/lib/auth";

// User type - customize based on your backend
interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Opens OAuth popup for web-based social authentication
 */
function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ CRITICAL FIX: Use ref to prevent concurrent fetches
  const isFetchingRef = useRef(false);

  // ✅ CRITICAL FIX: Memoize fetchUser to prevent recreation
  const fetchUser = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const session = await authClient.getSession();
      if (session?.user) {
        setUser(session.user as User);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []); // ✅ Empty deps - stable function

  // Fetch current user on mount only
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await authClient.signIn.email({ email, password });
      await fetchUser();
    } catch (error) {
      console.error("Email sign in failed:", error);
      throw error;
    }
  }, [fetchUser]);

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    try {
      await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: "/profile",
      });
      await fetchUser();
    } catch (error) {
      console.error("Email sign up failed:", error);
      throw error;
    }
  }, [fetchUser]);

  const signInWithGoogle = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        const token = await openOAuthPopup("google");
        storeWebBearerToken(token);
        await fetchUser();
      } else {
        await authClient.signIn.social({
          provider: "google",
          callbackURL: "/profile",
        });
        await fetchUser();
      }
    } catch (error) {
      console.error("Google sign in failed:", error);
      throw error;
    }
  }, [fetchUser]);

  const signInWithApple = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        const token = await openOAuthPopup("apple");
        storeWebBearerToken(token);
        await fetchUser();
      } else {
        await authClient.signIn.social({
          provider: "apple",
          callbackURL: "/profile",
        });
        await fetchUser();
      }
    } catch (error) {
      console.error("Apple sign in failed:", error);
      throw error;
    }
  }, [fetchUser]);

  const signInWithGitHub = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        const token = await openOAuthPopup("github");
        storeWebBearerToken(token);
        await fetchUser();
      } else {
        await authClient.signIn.social({
          provider: "github",
          callbackURL: "/profile",
        });
        await fetchUser();
      }
    } catch (error) {
      console.error("GitHub sign in failed:", error);
      throw error;
    }
  }, [fetchUser]);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  }, []);

  // ✅ CRITICAL FIX: Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInWithGitHub,
    signOut,
    fetchUser,
  }), [
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInWithGitHub,
    signOut,
    fetchUser,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
