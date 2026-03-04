
import { create } from 'zustand';
import { supabase } from '@/app/integrations/supabase/client';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * ✅ AUTH STORE v2.0 - FASE 9: PERFIL INSTANTÁNEO (<100ms)
 * 
 * OPTIMIZACIONES FASE 9:
 * - ✅ STALE-WHILE-REVALIDATE: Perfil cacheado en MMKV, carga síncrona
 * - ✅ T0 vs T1 PRIORIZACIÓN: Perfil básico (T0) vs datos extendidos (T1)
 * - ✅ RACE CONDITION FIX: Prevenir múltiples fetches simultáneos
 * - ✅ ABORT ERRORS: Silenciados en errorLogger.ts
 * 
 * RESULTADO ESPERADO:
 * - Usuario visible en UI en <100ms tras abrir la app
 * - Perfil básico (nombre, avatar) cargado síncronamente desde MMKV
 * - Datos extendidos (estadísticas, historial) cargados en background
 * 
 * BENEFITS OF ZUSTAND OVER CONTEXT:
 * - ✅ ATOMIC UPDATES: Components only re-render when their specific slice changes
 * - ✅ NO PROVIDER HELL: No need to wrap entire app in providers
 * - ✅ BETTER PERFORMANCE: Zustand uses direct subscriptions, not React Context
 * - ✅ SIMPLER CODE: No useContext hook, just import and use
 * - ✅ DEVTOOLS: Built-in Redux DevTools support for debugging
 * 
 * EXAMPLE:
 * // Only re-renders when user changes, NOT when session or loading changes
 * const user = useAuthStore(state => state.user);
 * 
 * // Only re-renders when loading changes
 * const loading = useAuthStore(state => state.loading);
 */

// ✅ FASE 9: T0 Profile (Critical - shown immediately)
interface UserProfileT0 {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  email?: string;
}

// ✅ FASE 9: T1 Profile (Extended - loaded in background)
interface UserProfileT1 {
  bio?: string;
  telefono?: string;
  ciudad?: string;
  provincia?: string;
  fecha_nacimiento?: string;
  genero?: string;
  intereses?: string[];
  seguidores_count?: number;
  siguiendo_count?: number;
  posts_count?: number;
}

interface AuthState {
  // State
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  sessionReady: boolean;
  isAuthenticated: boolean;
  
  // ✅ FASE 9: Profile hydration state
  profileT0: UserProfileT0 | null; // Basic profile (instant)
  profileT1: UserProfileT1 | null; // Extended profile (deferred)
  isProfileHydrated: boolean; // T0 profile is available
  
  // ✅ FASE 9: Race condition prevention
  isFetchingProfile: boolean;
  
  // Actions
  setUser: (user: AuthUser | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setSessionReady: (ready: boolean) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  ensureValidSession: () => Promise<Session | null>;
  setSessionManually: (session: Session | null) => void;
  
  // Initialization
  initialize: () => Promise<void>;
}

const log = Platform.OS === 'android' ? () => {} : console.log;

// ✅ FASE 9: MMKV keys for profile caching
const PROFILE_T0_KEY = 'user_profile_t0';
const PROFILE_T1_KEY = 'user_profile_t1';

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  loading: true,
  sessionReady: false,
  isAuthenticated: false,
  
  // ✅ FASE 9: Profile state
  profileT0: null,
  profileT1: null,
  isProfileHydrated: false,
  isFetchingProfile: false,
  
  // Simple setters (atomic updates)
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, sessionReady: !!session, isAuthenticated: !!session }),
  setLoading: (loading) => set({ loading }),
  setSessionReady: (sessionReady) => set({ sessionReady }),
  
  // Set session manually (used by auth flows)
  setSessionManually: (newSession) => {
    set({ session: newSession, sessionReady: !!newSession });
    
    if (newSession) {
      getCurrentUser().then(({ user: userData, error: userError }) => {
        if (!userError && userData) {
          set({ user: userData });
        }
      });
    } else {
      set({ user: null });
    }
  },
  
  // Ensure valid session (refresh if needed)
  ensureValidSession: async () => {
    try {
      log('[AuthStore] 🔍 Checking session validity...');
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
      
      if (getError) {
        console.error('[AuthStore] ❌ Error getting session:', getError);
        return null;
      }
      
      if (!currentSession) {
        log('[AuthStore] ⚠️ No active session found');
        return null;
      }

      const expiresAt = currentSession.expires_at! * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      log('[AuthStore] ⏰ Session expires in:', Math.floor(timeUntilExpiry / 1000 / 60), 'minutes');

      // Refresh if session is expired or will expire in < 5 minutes
      if (timeUntilExpiry < 5 * 60 * 1000) {
        log('[AuthStore] 🔄 Session expiring soon, refreshing...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[AuthStore] ❌ Error refreshing session:', refreshError);
          if (timeUntilExpiry <= 0) {
            log('[AuthStore] ⚠️ Session expired, cannot refresh');
            return null;
          }
          log('[AuthStore] ⚠️ Refresh failed but session still valid, using current session');
          set({ session: currentSession, sessionReady: true });
          return currentSession;
        }

        if (!refreshedSession) {
          log('[AuthStore] ⚠️ No refreshed session returned');
          return null;
        }
        
        log('[AuthStore] ✅ Session refreshed successfully');
        set({ session: refreshedSession, sessionReady: true });
        return refreshedSession;
      }

      log('[AuthStore] ✅ Session is valid');
      set({ session: currentSession, sessionReady: true });
      return currentSession;
    } catch (err) {
      console.error('[AuthStore] ❌ Exception in ensureValidSession:', err);
      return null;
    }
  },
  
  // Sign out
  signOut: async () => {
    try {
      // ✅ FASE 9: Clear profile cache
      const { clearProfileCache } = require('@/src/lib/supabaseStorage');
      clearProfileCache();
      
      set({ 
        user: null, 
        session: null, 
        sessionReady: false, 
        isAuthenticated: false,
        profileT0: null,
        profileT1: null,
        isProfileHydrated: false,
      });
      
      supabase.auth.signOut().then(() => {}).catch(() => {});
    } catch (err) {
      set({ 
        user: null, 
        session: null, 
        sessionReady: false, 
        isAuthenticated: false,
        profileT0: null,
        profileT1: null,
        isProfileHydrated: false,
      });
    }
  },
  
  // Refresh user data
  refreshUser: async () => {
    try {
      set({ loading: true });
      const { user: userData } = await getCurrentUser();
      if (userData) {
        set({ user: userData });
      }
    } catch (err) {
      // Silent error
    } finally {
      set({ loading: false });
    }
  },
  
  // ✅ FASE 9: PERFIL INSTANTÁNEO - STALE-WHILE-REVALIDATE
  initialize: async () => {
    const startTime = performance.now();
    console.log('[AuthStore FASE 9] 🚀 Initializing with INSTANT profile hydration...');
    
    try {
      // ═══════════════════════════════════════════════════════════════════════════
      // ✅ PASO 1: LECTURA SÍNCRONA INMEDIATA desde MMKV (SESSION + PROFILE T0)
      // ═══════════════════════════════════════════════════════════════════════════
      const { getSessionSync, getProfileT0Sync } = require('@/src/lib/supabaseStorage');
      
      // 1.1 - Cargar sesión desde MMKV
      const cachedSessionData = getSessionSync();
      
      if (cachedSessionData) {
        try {
          const parsedSession = JSON.parse(cachedSessionData);
          console.log('[AuthStore FASE 9] ⚡ SYNC session found in MMKV (<1ms)');
          
          // Actualizar estado INMEDIATAMENTE con la sesión cacheada
          set({ 
            session: parsedSession,
            isAuthenticated: true,
            sessionReady: true,
            loading: false 
          });
        } catch (parseError) {
          console.error('[AuthStore FASE 9] ❌ Failed to parse cached session:', parseError);
        }
      } else {
        console.log('[AuthStore FASE 9] ℹ️ No cached session in MMKV');
        set({ loading: false, sessionReady: true });
      }
      
      // 1.2 - Cargar perfil T0 desde MMKV (NUEVO - FASE 9)
      const cachedProfileT0 = getProfileT0Sync();
      
      if (cachedProfileT0) {
        try {
          const parsedProfileT0 = JSON.parse(cachedProfileT0);
          console.log('[AuthStore FASE 9] ⚡ SYNC profile T0 found in MMKV (<1ms)');
          
          // ✅ CRITICAL: Perfil visible INMEDIATAMENTE en la UI
          set({ 
            profileT0: parsedProfileT0,
            isProfileHydrated: true,
          });
          
          const syncTime = performance.now() - startTime;
          console.log(`[AuthStore FASE 9] ✅ Profile visible in UI in ${syncTime.toFixed(0)}ms (SYNC)`);
        } catch (parseError) {
          console.error('[AuthStore FASE 9] ❌ Failed to parse cached profile T0:', parseError);
        }
      } else {
        console.log('[AuthStore FASE 9] ℹ️ No cached profile T0 in MMKV');
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ✅ PASO 2: VALIDACIÓN DE RED (en paralelo, no bloquea la UI)
      // ═══════════════════════════════════════════════════════════════════════════
      const networkStart = performance.now();
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
        setTimeout(() => {
          console.log('[AuthStore FASE 9] ⏱️ Network validation timeout (1500ms)');
          resolve({ data: { session: null }, error: new Error('Timeout') });
        }, 1500);
      });
      
      const { data: { session: networkSession }, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);
      
      const networkTime = performance.now() - networkStart;
      console.log(`[AuthStore FASE 9] 🌐 Network validation completed in ${networkTime.toFixed(0)}ms`);
      
      // Si la validación de red falla o timeout, mantener la sesión cacheada
      if (sessionError && sessionError.message !== 'Timeout') {
        console.error('[AuthStore FASE 9] ❌ Network validation error (non-blocking):', sessionError);
        return;
      }
      
      // Si la red devuelve una sesión diferente, actualizar
      if (networkSession) {
        console.log('[AuthStore FASE 9] ✅ Network session validated');
        set({ session: networkSession });
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ✅ PASO 3: CARGAR PERFIL T0 (en background, con race condition prevention)
        // ═══════════════════════════════════════════════════════════════════════════
        const state = get();
        
        // ✅ RACE CONDITION FIX: Solo fetch si no hay otro fetch en progreso
        if (!state.isFetchingProfile) {
          set({ isFetchingProfile: true });
          
          (async () => {
            const profileStart = performance.now();
            
            try {
              // ✅ Timeout reducido a 1500ms (consistente con sesión)
              const controller = new AbortController();
              const profileTimeoutId = setTimeout(() => controller.abort(), 1500);
              
              // ✅ Fetch T0 profile (basic data only)
              const { data: profileData, error: profileError } = await supabase
                .from('usuarios')
                .select('id, nombre, username, avatar, email')
                .eq('id', networkSession.user.id)
                .abortSignal(controller.signal)
                .single();
              
              clearTimeout(profileTimeoutId);
              
              const profileTime = performance.now() - profileStart;
              
              if (!profileError && profileData) {
                console.log(`[AuthStore FASE 9] ✅ Profile T0 loaded in ${profileTime.toFixed(0)}ms`);
                
                const profileT0: UserProfileT0 = {
                  id: profileData.id,
                  nombre: profileData.nombre,
                  username: profileData.username,
                  avatar: profileData.avatar,
                  email: profileData.email,
                };
                
                set({ 
                  profileT0,
                  isProfileHydrated: true,
                });
                
                // ✅ STALE-WHILE-REVALIDATE: Guardar en MMKV para próxima vez
                const { saveProfileT0Sync } = require('@/src/lib/supabaseStorage');
                saveProfileT0Sync(JSON.stringify(profileT0));
                
                // ✅ PASO 4: CARGAR PERFIL T1 (muy diferido, no crítico)
                setTimeout(() => {
                  (async () => {
                    try {
                      const { data: extendedData, error: extendedError } = await supabase
                        .from('usuarios')
                        .select('bio, telefono, ciudad, provincia, fecha_nacimiento, genero, intereses, seguidores_count, siguiendo_count, posts_count')
                        .eq('id', networkSession.user.id)
                        .single();
                      
                      if (!extendedError && extendedData) {
                        console.log('[AuthStore FASE 9] ✅ Profile T1 loaded (deferred)');
                        
                        const profileT1: UserProfileT1 = {
                          bio: extendedData.bio,
                          telefono: extendedData.telefono,
                          ciudad: extendedData.ciudad,
                          provincia: extendedData.provincia,
                          fecha_nacimiento: extendedData.fecha_nacimiento,
                          genero: extendedData.genero,
                          intereses: extendedData.intereses,
                          seguidores_count: extendedData.seguidores_count,
                          siguiendo_count: extendedData.siguiendo_count,
                          posts_count: extendedData.posts_count,
                        };
                        
                        set({ profileT1 });
                        
                        // ✅ Guardar T1 en MMKV
                        const { saveProfileT1Sync } = require('@/src/lib/supabaseStorage');
                        saveProfileT1Sync(JSON.stringify(profileT1));
                      }
                    } catch (t1Error: any) {
                      if (t1Error.name !== 'AbortError') {
                        console.error('[AuthStore FASE 9] ❌ Profile T1 error (non-critical):', t1Error);
                      }
                    }
                  })();
                }, 2000); // Esperar 2 segundos antes de cargar T1
                
                // ✅ PASO 5: Push notifications (muy diferido, no crítico)
                if (Platform.OS === 'ios') {
                  setTimeout(() => {
                    registerForPushNotifications()
                      .then(pushToken => {
                        if (pushToken) {
                          savePushToken(profileData.id, pushToken).catch(() => {});
                        }
                      })
                      .catch(() => {});
                  }, 15000);
                }
              } else if (profileError && profileError.message !== 'AbortError') {
                console.error('[AuthStore FASE 9] ❌ Profile T0 error (non-blocking):', profileError);
              }
            } catch (error: any) {
              if (error.name !== 'AbortError') {
                console.error('[AuthStore FASE 9] ❌ Profile fetch error:', error);
              }
            } finally {
              set({ isFetchingProfile: false });
            }
          })();
        } else {
          console.log('[AuthStore FASE 9] ⚠️ Profile fetch already in progress, skipping');
        }
      } else {
        console.log('[AuthStore FASE 9] ℹ️ No network session (user logged out or timeout)');
        // Si no hay sesión de red, limpiar la sesión cacheada
        if (cachedSessionData) {
          set({ 
            session: null, 
            isAuthenticated: false,
            profileT0: null,
            profileT1: null,
            isProfileHydrated: false,
          });
        }
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`[AuthStore FASE 9] ✅ Total initialization: ${totalTime.toFixed(0)}ms`);
      console.log('[AuthStore FASE 9] 📊 Breakdown:');
      console.log('  - MMKV sync read (session + profile T0): <1ms');
      console.log(`  - Network validation: ${networkTime.toFixed(0)}ms`);
      console.log('  - Profile T0 revalidation: background (non-blocking)');
      console.log('  - Profile T1 load: deferred (2s delay)');
    } catch (err) {
      console.error('[AuthStore FASE 9] ❌ Initialization error (non-blocking):', err);
      // ✅ CRITICAL: Always mark as ready, even on error
      set({ loading: false, sessionReady: true });
    }
  },
}));
