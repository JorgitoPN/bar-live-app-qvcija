
/**
 * ✅ USERNAME GENERATOR UTILITY
 * 
 * Generates unique usernames for local profiles based on their name
 * Used when a local activates a paid subscription plan
 */

import { supabase } from './supabase';

/**
 * Generate a clean username from a local name
 */
export function generateUsernameFromName(localName: string): string {
  // Remove special characters and convert to lowercase
  let username = localName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Remove duplicate underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

  // Limit to 30 characters
  if (username.length > 30) {
    username = username.substring(0, 30);
  }

  // Ensure minimum length
  if (username.length < 3) {
    username = username + '_local';
  }

  return username;
}

/**
 * Check if a username is available (not used by any user or local)
 */
export async function isUsernameAvailable(username: string, excludeLocalId?: string): Promise<boolean> {
  try {
    // Check in usuarios table
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[usernameGenerator] Error checking username in usuarios:', userError);
      return false;
    }

    if (userData) {
      console.log('[usernameGenerator] Username taken by user:', username);
      return false;
    }

    // Check in locales table
    let query = supabase
      .from('locales')
      .select('id')
      .eq('username', username);

    if (excludeLocalId) {
      query = query.neq('id', excludeLocalId);
    }

    const { data: localData, error: localError } = await query.maybeSingle();

    if (localError && localError.code !== 'PGRST116') {
      console.error('[usernameGenerator] Error checking username in locales:', localError);
      return false;
    }

    if (localData) {
      console.log('[usernameGenerator] Username taken by local:', username);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[usernameGenerator] Error checking username availability:', error);
    return false;
  }
}

/**
 * Generate a unique username for a local
 * Tries base username, then adds numbers if needed
 */
export async function generateUniqueUsername(localName: string, localId?: string): Promise<string> {
  const baseUsername = generateUsernameFromName(localName);
  
  console.log('[usernameGenerator] Generating unique username for:', localName);
  console.log('[usernameGenerator] Base username:', baseUsername);

  // Try base username first
  const isAvailable = await isUsernameAvailable(baseUsername, localId);
  if (isAvailable) {
    console.log('[usernameGenerator] ✅ Base username available:', baseUsername);
    return baseUsername;
  }

  // Try with numbers
  for (let i = 1; i <= 999; i++) {
    const candidate = `${baseUsername}${i}`;
    const isAvailable = await isUsernameAvailable(candidate, localId);
    if (isAvailable) {
      console.log('[usernameGenerator] ✅ Found available username:', candidate);
      return candidate;
    }
  }

  // Fallback: use first 8 chars of local ID
  const fallback = `${baseUsername}_${localId?.substring(0, 8) || 'local'}`;
  console.log('[usernameGenerator] ⚠️ Using fallback username:', fallback);
  return fallback;
}

/**
 * Assign username to a local when they activate a paid plan
 */
export async function assignUsernameToLocal(localId: string): Promise<string | null> {
  try {
    console.log('[usernameGenerator] 🎯 Assigning username to local:', localId);

    // Get local data
    const { data: localData, error: localError } = await supabase
      .from('locales')
      .select('id, nombre, username')
      .eq('id', localId)
      .single();

    if (localError || !localData) {
      console.error('[usernameGenerator] Error fetching local:', localError);
      return null;
    }

    // If already has username, return it
    if (localData.username) {
      console.log('[usernameGenerator] ✅ Local already has username:', localData.username);
      return localData.username;
    }

    // Generate unique username
    const newUsername = await generateUniqueUsername(localData.nombre, localId);

    // Update local with new username
    const { error: updateError } = await supabase
      .from('locales')
      .update({ username: newUsername })
      .eq('id', localId);

    if (updateError) {
      console.error('[usernameGenerator] Error updating local username:', updateError);
      return null;
    }

    console.log('[usernameGenerator] ✅ Username assigned successfully:', newUsername);
    return newUsername;
  } catch (error) {
    console.error('[usernameGenerator] Error assigning username:', error);
    return null;
  }
}
