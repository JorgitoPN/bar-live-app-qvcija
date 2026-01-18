
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface ImpersonationSession {
  id: string;
  admin_id: string;
  impersonated_user_id: string;
  impersonated_user_name: string;
  impersonated_user_email: string;
  started_at: string;
  is_active: boolean;
}

interface ImpersonatedUser {
  id: string;
  nombre: string;
  email: string;
  avatar?: string;
  rol_app: string;
  username?: string;
  bio?: string;
  telefono?: string;
  local_profile_id?: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonationSession: ImpersonationSession | null;
  impersonatedUser: ImpersonatedUser | null;
  effectiveUserId: string | null; // The user ID to use for all queries
  effectiveUser: ImpersonatedUser | null; // The user object to use for all UI
  startImpersonation: (userId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  loading: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const IMPERSONATION_KEY = '@barlive_impersonation_session';

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user: adminUser } = useAuth();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationSession, setImpersonationSession] = useState<ImpersonationSession | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load active impersonation session on mount
  useEffect(() => {
    loadActiveImpersonation();
  }, [adminUser]);

  const loadActiveImpersonation = async () => {
    try {
      setLoading(true);
      
      // Check AsyncStorage first
      const storedSession = await AsyncStorage.getItem(IMPERSONATION_KEY);
      
      if (storedSession) {
        const session: ImpersonationSession = JSON.parse(storedSession);
        
        // Verify session is still active in database
        const { data: dbSession, error } = await supabase
          .from('admin_impersonation_sessions')
          .select('*')
          .eq('id', session.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('[Impersonation] Error verifying session:', error);
          await AsyncStorage.removeItem(IMPERSONATION_KEY);
          setLoading(false);
          return;
        }

        if (dbSession) {
          // Load impersonated user data
          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', dbSession.impersonated_user_id)
            .single();

          if (userError) {
            console.error('[Impersonation] Error loading impersonated user:', userError);
            await AsyncStorage.removeItem(IMPERSONATION_KEY);
            setLoading(false);
            return;
          }

          console.log('[Impersonation] ✅ Active impersonation loaded:', userData.nombre);
          setImpersonationSession(dbSession);
          setImpersonatedUser(userData);
          setIsImpersonating(true);
        } else {
          // Session no longer active, clear storage
          await AsyncStorage.removeItem(IMPERSONATION_KEY);
        }
      }
    } catch (error) {
      console.error('[Impersonation] Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const startImpersonation = async (userId: string) => {
    if (!adminUser) {
      throw new Error('No admin user found');
    }

    try {
      // Load user to impersonate
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Create impersonation session
      const { data: sessionData, error: sessionError } = await supabase
        .from('admin_impersonation_sessions')
        .insert({
          admin_id: adminUser.id,
          impersonated_user_id: userId,
          admin_email: adminUser.email || '',
          impersonated_user_email: userData.email,
          impersonated_user_name: userData.nombre,
          is_active: true,
          reason: 'Admin impersonation for support/debugging',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Store in AsyncStorage
      await AsyncStorage.setItem(IMPERSONATION_KEY, JSON.stringify(sessionData));

      setImpersonationSession(sessionData);
      setImpersonatedUser(userData);
      setIsImpersonating(true);

      console.log('[Impersonation] ✅ Started impersonating:', userData.nombre);
    } catch (error) {
      console.error('[Impersonation] Error starting impersonation:', error);
      throw error;
    }
  };

  const endImpersonation = async () => {
    if (!impersonationSession) return;

    try {
      // Update session in database
      const { error } = await supabase
        .from('admin_impersonation_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq('id', impersonationSession.id);

      if (error) throw error;

      // Clear AsyncStorage
      await AsyncStorage.removeItem(IMPERSONATION_KEY);

      setImpersonationSession(null);
      setImpersonatedUser(null);
      setIsImpersonating(false);

      console.log('[Impersonation] ✅ Ended impersonation');
    } catch (error) {
      console.error('[Impersonation] Error ending impersonation:', error);
      throw error;
    }
  };

  // Compute effective user ID (impersonated user if active, otherwise admin user)
  const effectiveUserId = isImpersonating && impersonatedUser 
    ? impersonatedUser.id 
    : adminUser?.id || null;

  const effectiveUser = isImpersonating && impersonatedUser 
    ? impersonatedUser 
    : adminUser;

  const value = {
    isImpersonating,
    impersonationSession,
    impersonatedUser,
    effectiveUserId,
    effectiveUser,
    startImpersonation,
    endImpersonation,
    loading,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  
  return context;
}
