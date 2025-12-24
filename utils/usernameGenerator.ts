
/**
 * ✅ USERNAME GENERATOR UTILITY
 * 
 * Generates unique usernames for users and local profiles based on their name
 * Used during registration and when a local activates a paid subscription plan
 */

import { supabase } from './supabase';

/**
 * Generate a clean username from a name
 */
export function generateUsernameFromName(name: string): string {
  // Remove special characters and convert to lowercase
  let username = name
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
    username = username + '_user';
  }

  return username;
}

/**
 * Check if a username is available (not used by any user or local)
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string, excludeLocalId?: string): Promise<boolean> {
  try {
    // Check in usuarios table
    let userQuery = supabase
      .from('usuarios')
      .select('id')
      .eq('username', username);

    if (excludeUserId) {
      userQuery = userQuery.neq('id', excludeUserId);
    }

    const { data: userData, error: userError } = await userQuery.maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[usernameGenerator] Error checking username in usuarios:', userError);
      return false;
    }

    if (userData) {
      console.log('[usernameGenerator] Username taken by user:', username);
      return false;
    }

    // Check in locales table
    let localQuery = supabase
      .from('locales')
      .select('id')
      .eq('username', username);

    if (excludeLocalId) {
      localQuery = localQuery.neq('id', excludeLocalId);
    }

    const { data: localData, error: localError } = await localQuery.maybeSingle();

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
 * Generate a unique username
 * Tries base username, then adds numbers if needed
 */
export async function generateUniqueUsername(name: string, userId?: string, localId?: string): Promise<string> {
  const baseUsername = generateUsernameFromName(name);
  
  console.log('[usernameGenerator] Generating unique username for:', name);
  console.log('[usernameGenerator] Base username:', baseUsername);

  // Try base username first
  const isAvailable = await isUsernameAvailable(baseUsername, userId, localId);
  if (isAvailable) {
    console.log('[usernameGenerator] ✅ Base username available:', baseUsername);
    return baseUsername;
  }

  // Try with numbers
  for (let i = 1; i <= 999; i++) {
    const candidate = `${baseUsername}${i}`;
    const isAvailable = await isUsernameAvailable(candidate, userId, localId);
    if (isAvailable) {
      console.log('[usernameGenerator] ✅ Found available username:', candidate);
      return candidate;
    }
  }

  // Fallback: use first 8 chars of ID + random number
  const randomNum = Math.floor(Math.random() * 9999);
  const fallback = `${baseUsername}_${randomNum}`;
  console.log('[usernameGenerator] ⚠️ Using fallback username:', fallback);
  return fallback;
}

/**
 * Generate username for a new user during registration
 */
export async function generateUsername(name: string): Promise<string> {
  return generateUniqueUsername(name);
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
    const newUsername = await generateUniqueUsername(localData.nombre, undefined, localId);

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
