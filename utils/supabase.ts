
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Configuración de Supabase usando variables de entorno
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// ✅ FIXED: Custom storage implementation with better error handling
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      // ✅ FIXED: Add timeout and better error handling
      const value = await Promise.race([
        SecureStore.getItemAsync(key),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))
      ]);
      return value;
    } catch (error: any) {
      // ✅ FIXED: Silently handle SecureStore errors (user interaction not allowed)
      // This is expected on iOS when the app starts without user interaction
      if (error?.message?.includes('User interaction is not allowed')) {
        console.log('[SecureStore] User interaction required - will retry on next user action');
        return null;
      }
      console.error('[SecureStore] Error getting item:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error: any) {
      // ✅ FIXED: Silently handle SecureStore errors
      if (error?.message?.includes('User interaction is not allowed')) {
        console.log('[SecureStore] User interaction required for setItem');
        return;
      }
      console.error('[SecureStore] Error setting item:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error: any) {
      // ✅ FIXED: Silently handle SecureStore errors
      if (error?.message?.includes('User interaction is not allowed')) {
        console.log('[SecureStore] User interaction required for removeItem');
        return;
      }
      console.error('[SecureStore] Error removing item:', error);
    }
  },
};

// Create Supabase client with custom storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
