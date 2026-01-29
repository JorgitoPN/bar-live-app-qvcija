
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/utils/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Extended user type with app-specific fields
export interface User extends SupabaseUser {
  rol_app?: string;
  nombre?: string;
  username?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (authUser: SupabaseUser) => {
    try {
      console.log('[AuthContext] 📋 Loading user profile for:', authUser.id);
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol_app, nombre, username, avatar')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('[AuthContext] ❌ Error loading user profile:', error);
        return authUser as User;
      }

      console.log('[AuthContext] ✅ User profile loaded:', data);
      
      return {
        ...authUser,
        rol_app: data?.rol_app || 'cliente',
        nombre: data?.nombre,
        username: data?.username,
        avatar: data?.avatar,
      } as User;
    } catch (error) {
      console.error('[AuthContext] ❌ Error loading user profile:', error);
      return authUser as User;
    }
  }, []);

  useEffect(() => {
    console.log('[AuthContext] 🔐 Initializing auth...');
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] 📋 Initial session:', session ? 'Found' : 'None');
      setSession(session);
      
      if (session?.user) {
        const userWithProfile = await loadUserProfile(session.user);
        setUser(userWithProfile);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthContext] 🔄 Auth state changed:', _event);
      setSession(session);
      
      if (session?.user) {
        const userWithProfile = await loadUserProfile(session.user);
        setUser(userWithProfile);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const signOut = async () => {
    console.log('[AuthContext] 👋 Signing out...');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      console.log('[AuthContext] ✅ Sign out successful');
    } catch (error) {
      console.error('[AuthContext] ❌ Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
