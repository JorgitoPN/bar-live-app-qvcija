
// IMPORTANT: This file now re-exports the single Supabase client instance
// to maintain compatibility with existing imports throughout the app.
// All Supabase operations should use the same client instance to ensure
// consistent session management and storage.

import { supabase } from '@/utils/supabase';

export { supabase };
export type { Database } from './types';
