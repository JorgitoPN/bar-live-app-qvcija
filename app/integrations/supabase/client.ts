import type { Database } from './types';
import { createClient } from '@supabase/supabase-js';
import { supabaseStorage } from '../../src/lib/supabaseStorage';

const SUPABASE_URL = "https://embntaqwlwmgazvrglaf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

/**
 * ✅ v8.0: Supabase client with modular storage
 * 
 * Uses the supabaseStorage adapter which automatically selects:
 * - MMKV (if available in Development Build) - 10-30x faster
 * - AsyncStorage (fallback for Expo Go) - reliable and compatible
 * 
 * This configuration works seamlessly in both Expo Go and Development Builds.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: supabaseStorage as any, // Use our modular storage adapter
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
