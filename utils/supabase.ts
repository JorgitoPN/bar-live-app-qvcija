
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de Supabase usando variables de entorno
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Flag to track if app is ready for SecureStore access
let isAppReady = false;

// Set app as ready after a short delay to ensure full initialization
setTimeout(() => {
  isAppReady = true;
  console.log('[Supabase] ✅ App ready for SecureStore access');
}, 1000);

// Custom storage implementation for React Native with fallback
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      // On iOS, check if app is ready before accessing SecureStore
      if (Platform.OS === 'ios' && !isAppReady) {
        console.log('[SecureStore] ⏳ App not ready yet, using AsyncStorage fallback');
        return await AsyncStorage.getItem(key);
      }
      
      const value = await SecureStore.getItemAsync(key);
      return value;
    } catch (error: any) {
      console.error('[SecureStore] ❌ Error getting item:', error?.message || error);
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        console.log('[SecureStore] 🔄 Falling back to AsyncStorage');
        return await AsyncStorage.getItem(key);
      } catch (fallbackError) {
        console.error('[SecureStore] ❌ AsyncStorage fallback also failed:', fallbackError);
        return null;
      }
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      // On iOS, check if app is ready before accessing SecureStore
      if (Platform.OS === 'ios' && !isAppReady) {
        console.log('[SecureStore] ⏳ App not ready yet, using AsyncStorage fallback');
        await AsyncStorage.setItem(key, value);
        return;
      }
      
      await SecureStore.setItemAsync(key, value);
    } catch (error: any) {
      console.error('[SecureStore] ❌ Error setting item:', error?.message || error);
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        console.log('[SecureStore] 🔄 Falling back to AsyncStorage');
        await AsyncStorage.setItem(key, value);
      } catch (fallbackError) {
        console.error('[SecureStore] ❌ AsyncStorage fallback also failed:', fallbackError);
      }
    }
  },
  removeItem: async (key: string) => {
    try {
      // On iOS, check if app is ready before accessing SecureStore
      if (Platform.OS === 'ios' && !isAppReady) {
        console.log('[SecureStore] ⏳ App not ready yet, using AsyncStorage fallback');
        await AsyncStorage.removeItem(key);
        return;
      }
      
      await SecureStore.deleteItemAsync(key);
    } catch (error: any) {
      console.error('[SecureStore] ❌ Error removing item:', error?.message || error);
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        console.log('[SecureStore] 🔄 Falling back to AsyncStorage');
        await AsyncStorage.removeItem(key);
      } catch (fallbackError) {
        console.error('[SecureStore] ❌ AsyncStorage fallback also failed:', fallbackError);
      }
    }
  },
};

// Create Supabase client with custom storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable URL detection on web for OAuth callback
    flowType: 'pkce', // Use PKCE flow for better security
    // CRITICAL FIX: Increase storage key to avoid conflicts
    storageKey: 'supabase.auth.token',
    // CRITICAL FIX: Enable debug mode to see what's happening
    debug: false, // Set to true only for debugging
  },
});

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
