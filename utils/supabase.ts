
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use environment variables with fallback to hardcoded values
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://embntaqwlwmgazvrglaf.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing configuration');
  throw new Error('Missing Supabase environment variables');
}

console.log('[Supabase v326.0] Initializing client with Android optimizations...');

// CRITICAL FIX v326.0: ANDROID PERFORMANCE OPTIMIZATION
// Disable realtime on Android to prevent CHANNEL_ERROR and performance issues
// Use polling instead for Android devices
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: Platform.OS === 'android' ? {
    // Android: Minimal realtime configuration to reduce overhead
    params: {
      log_level: 'error', // Only log errors, not info
      eventsPerSecond: 2, // Throttle events
    },
    timeout: 10000, // Shorter timeout
  } : {
    // iOS: Full realtime support
    params: {
      log_level: 'info',
    },
  },
  global: {
    headers: Platform.OS === 'android' ? {
      'X-Client-Info': 'supabase-js-android',
    } : {
      'X-Client-Info': 'supabase-js-ios',
    },
  },
});

console.log('[Supabase v326.0] ✅ Client initialized for platform:', Platform.OS);
