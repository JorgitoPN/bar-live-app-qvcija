
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native';

const SUPABASE_URL = "https://embntaqwlwmgazvrglaf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable URL detection on web
  },
})
