
import { createClient } from '@supabase/supabase-js';
import { supabaseStorage } from '@/src/lib/supabaseStorage';

// Use environment variables with fallback to hardcoded values
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://embntaqwlwmgazvrglaf.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing configuration');
  throw new Error('Missing Supabase environment variables');
}

console.log('[Supabase] Initializing client with platform-aware storage (MMKV on native, AsyncStorage on Web)...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      log_level: 'info',
    },
  },
});

/**
 * Check if Supabase is properly configured
 * Returns true if both URL and anon key are available
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY');
};
