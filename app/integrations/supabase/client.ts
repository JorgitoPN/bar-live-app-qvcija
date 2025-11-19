
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = "https://embntaqwlwmgazvrglaf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI";

// Custom storage implementation matching utils/supabase.ts
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
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
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
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
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
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

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // ALWAYS enable URL detection for OAuth callback
    flowType: 'pkce', // Use PKCE flow for better security
    storageKey: 'supabase.auth.token', // Use consistent storage key
    debug: __DEV__, // Enable debug logging in development
  },
})
