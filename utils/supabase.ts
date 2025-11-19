
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de Supabase usando variables de entorno
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// CRITICAL: Use a consistent storage key across the entire app
const STORAGE_KEY = 'supabase.auth.token';

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

// CRITICAL: Create a SINGLE Supabase client instance for the entire app
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Only enable for web
    flowType: 'pkce', // Use PKCE flow for better security
    storageKey: STORAGE_KEY,
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

// Export the storage adapter for use in other files
export { ExpoSecureStoreAdapter, STORAGE_KEY };
