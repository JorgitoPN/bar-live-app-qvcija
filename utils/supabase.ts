
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de Supabase usando variables de entorno
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage implementation for React Native with improved error handling and logging
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      console.log('[SecureStore] 📥 Getting item:', key);
      
      if (Platform.OS === 'web') {
        const value = localStorage.getItem(key);
        console.log('[SecureStore] ✅ Web localStorage get:', value ? 'found' : 'not found');
        return value;
      }
      
      const value = await SecureStore.getItemAsync(key);
      console.log('[SecureStore] ✅ SecureStore get:', value ? 'found' : 'not found');
      return value;
    } catch (error: any) {
      console.error('[SecureStore] ❌ Error getting item:', error?.message || error);
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        console.log('[SecureStore] 🔄 Falling back to AsyncStorage');
        const value = await AsyncStorage.getItem(key);
        console.log('[SecureStore] ✅ AsyncStorage get:', value ? 'found' : 'not found');
        return value;
      } catch (fallbackError) {
        console.error('[SecureStore] ❌ AsyncStorage fallback also failed:', fallbackError);
        return null;
      }
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      console.log('[SecureStore] 💾 Setting item:', key, 'length:', value.length);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        console.log('[SecureStore] ✅ Web localStorage set successful');
        return;
      }
      
      await SecureStore.setItemAsync(key, value);
      console.log('[SecureStore] ✅ SecureStore set successful');
    } catch (error: any) {
      console.error('[SecureStore] ❌ Error setting item:', error?.message || error);
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        console.log('[SecureStore] 🔄 Falling back to AsyncStorage');
        await AsyncStorage.setItem(key, value);
        console.log('[SecureStore] ✅ AsyncStorage set successful');
      } catch (fallbackError) {
        console.error('[SecureStore] ❌ AsyncStorage fallback also failed:', fallbackError);
      }
    }
  },
  removeItem: async (key: string) => {
    try {
      console.log('[SecureStore] 🗑️ Removing item:', key);
      
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        console.log('[SecureStore] ✅ Web localStorage remove successful');
        return;
      }
      
      await SecureStore.deleteItemAsync(key);
      console.log('[SecureStore] ✅ SecureStore remove successful');
    } catch (error: any) {
      console.error('[SecureStore] ❌ Error removing item:', error?.message || error);
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        console.log('[SecureStore] 🔄 Falling back to AsyncStorage');
        await AsyncStorage.removeItem(key);
        console.log('[SecureStore] ✅ AsyncStorage remove successful');
      } catch (fallbackError) {
        console.error('[SecureStore] ❌ AsyncStorage fallback also failed:', fallbackError);
      }
    }
  },
};

// Create Supabase client with custom storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // ALWAYS enable URL detection for OAuth callback
    flowType: 'pkce', // Use PKCE flow for better security
    storageKey: 'supabase.auth.token',
    debug: __DEV__, // Enable debug mode in development
  },
});

// Add global auth state change listener for debugging
if (__DEV__) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Global] 🔄 Auth state changed:', event);
    if (session) {
      console.log('[Supabase Global] ✅ Session present:', {
        user: session.user.email,
        expiresAt: new Date(session.expires_at! * 1000).toISOString(),
      });
    } else {
      console.log('[Supabase Global] ⚠️ No session');
    }
  });
}

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  const isConfigured = 
    SUPABASE_URL && 
    SUPABASE_ANON_KEY && 
    SUPABASE_URL.includes('supabase.co') &&
    SUPABASE_URL !== 'https://tu-proyecto.supabase.co' && 
    SUPABASE_ANON_KEY !== 'tu-anon-key';
  
  if (!isConfigured) {
    console.warn('⚠️ Supabase no está configurado. Por favor configura tus credenciales en el archivo .env');
  } else {
    console.log('✅ Supabase configurado correctamente:', SUPABASE_URL);
  }
  
  return isConfigured;
};

// Helper to get configuration status message
export const getSupabaseConfigMessage = () => {
  if (isSupabaseConfigured()) {
    return 'Supabase está configurado correctamente';
  }
  
  return `Para usar las funcionalidades de backend, necesitas configurar Supabase:

1. Crea un proyecto en https://supabase.com
2. Ve a Project Settings > API
3. Copia tu Project URL y anon/public key
4. Crea un archivo .env en la raíz del proyecto con:
   EXPO_PUBLIC_SUPABASE_URL=tu-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-key
5. Reinicia el servidor de desarrollo

Mientras tanto, la app funcionará en modo demo con datos de ejemplo.`;
};

// Helper function to manually check and restore session from storage
export const manuallyRestoreSession = async (): Promise<{ success: boolean; session: any | null }> => {
  try {
    console.log('[Supabase] 🔍 Intentando restaurar sesión manualmente desde storage...');
    
    // Try to get the session from storage directly
    const storageKey = 'supabase.auth.token';
    const storedSession = await ExpoSecureStoreAdapter.getItem(storageKey);
    
    if (!storedSession) {
      console.log('[Supabase] ⚠️ No hay sesión almacenada');
      return { success: false, session: null };
    }
    
    console.log('[Supabase] ✅ Sesión encontrada en storage');
    
    // Parse the stored session
    const parsedSession = JSON.parse(storedSession);
    console.log('[Supabase] 📦 Sesión parseada:', {
      hasAccessToken: !!parsedSession.access_token,
      hasRefreshToken: !!parsedSession.refresh_token,
      expiresAt: parsedSession.expires_at ? new Date(parsedSession.expires_at * 1000).toISOString() : 'unknown',
    });
    
    // Check if session is expired
    if (parsedSession.expires_at && parsedSession.expires_at * 1000 < Date.now()) {
      console.log('[Supabase] ⚠️ Sesión expirada, intentando refrescar...');
      
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: parsedSession.refresh_token,
      });
      
      if (error) {
        console.error('[Supabase] ❌ Error refrescando sesión:', error);
        return { success: false, session: null };
      }
      
      if (data.session) {
        console.log('[Supabase] ✅ Sesión refrescada exitosamente');
        return { success: true, session: data.session };
      }
    }
    
    // Try to set the session
    const { data, error } = await supabase.auth.setSession({
      access_token: parsedSession.access_token,
      refresh_token: parsedSession.refresh_token,
    });
    
    if (error) {
      console.error('[Supabase] ❌ Error estableciendo sesión:', error);
      return { success: false, session: null };
    }
    
    if (data.session) {
      console.log('[Supabase] ✅ Sesión restaurada exitosamente');
      return { success: true, session: data.session };
    }
    
    return { success: false, session: null };
  } catch (error) {
    console.error('[Supabase] ❌ Error en manuallyRestoreSession:', error);
    return { success: false, session: null };
  }
};
