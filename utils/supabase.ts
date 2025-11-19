
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Configuración de Supabase usando variables de entorno
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage implementation for React Native using SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item from SecureStore:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error setting item in SecureStore:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item from SecureStore:', error);
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
