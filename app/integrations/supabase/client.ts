
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
      console.log('[SecureStore/integrations] 📥 Getting item:', key);
      
      if (Platform.OS === 'web') {
        const value = localStorage.getItem(key);
        console.log('[SecureStore/integrations] ✅ Web localStorage get:', value ? 'found' : 'not found');
        return value;
      }
      
      const value = await SecureStore.getItemAsync(key);
      console.log('[SecureStore/integrations] ✅ SecureStore get:', value ? 'found' : 'not found');
      return value;
    } catch (error: any) {
      console.error('[SecureStore/integrations] ❌ Error getting item:', error?.message || error);
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        console.log('[SecureStore/integrations] 🔄 Falling back to AsyncStorage');
        const value = await AsyncStorage.getItem(key);
        console.log('[SecureStore/integrations] ✅ AsyncStorage get:', value ? 'found' : 'not found');
        return value;
      } catch (fallbackError) {
        console.error('[SecureStore/integrations] ❌ AsyncStorage fallback also failed:', fallbackError);
        return null;
      }
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      console.log('[SecureStore/integrations] 💾 Setting item:', key, 'length:', value.length);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        console.log('[SecureStore/integrations] ✅ Web localStorage set successful');
        return;
      }
      
      await SecureStore.setItemAsync(key, value);
      console.log('[SecureStore/integrations] ✅ SecureStore set successful');
    } catch (error: any) {
      console.error('[SecureStore/integrations] ❌ Error setting item:', error?.message || error);
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        console.log('[SecureStore/integrations] 🔄 Falling back to AsyncStorage');
        await AsyncStorage.setItem(key, value);
        console.log('[SecureStore/integrations] ✅ AsyncStorage set successful');
      } catch (fallbackError) {
        console.error('[SecureStore/integrations] ❌ AsyncStorage fallback also failed:', fallbackError);
      }
    }
  },
  removeItem: async (key: string) => {
    try {
      console.log('[SecureStore/integrations] 🗑️ Removing item:', key);
      
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        console.log('[SecureStore/integrations] ✅ Web localStorage remove successful');
        return;
      }
      
      await SecureStore.deleteItemAsync(key);
      console.log('[SecureStore/integrations] ✅ SecureStore remove successful');
    } catch (error: any) {
      console.error('[SecureStore/integrations] ❌ Error removing item:', error?.message || error);
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        console.log('[SecureStore/integrations] 🔄 Falling back to AsyncStorage');
        await AsyncStorage.removeItem(key);
        console.log('[SecureStore/integrations] ✅ AsyncStorage remove successful');
      } catch (fallbackError) {
        console.error('[SecureStore/integrations] ❌ AsyncStorage fallback also failed:', fallbackError);
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
