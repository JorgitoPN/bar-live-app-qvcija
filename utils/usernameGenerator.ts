
/**
 * ✅ USERNAME GENERATOR UTILITY
 * 
 * Generates unique usernames for users and local profiles based on their name
 * Used during registration and when a local activates a paid subscription plan
 */

import { supabase } from './supabase';

/**
 * List of reserved usernames that cannot be used by users or locals
 * These are reserved for system use, brand protection, and common terms
 */
const RESERVED_USERNAMES = [
  // System and admin
  'admin', 'administrator', 'administrador', 'root', 'system', 'sistema',
  'moderator', 'moderador', 'mod', 'staff', 'equipo', 'support', 'soporte',
  'help', 'ayuda', 'info', 'informacion', 'contact', 'contacto',
  
  // Brand protection
  'barlive', 'bar_live', 'barliveapp', 'barlive_app', 'oficial', 'official',
  'verified', 'verificado', 'premium', 'vip', 'pro',
  
  // Common terms
  'user', 'usuario', 'guest', 'invitado', 'anonymous', 'anonimo',
  'deleted', 'eliminado', 'banned', 'bloqueado', 'suspended', 'suspendido',
  
  // Inappropriate
  'null', 'undefined', 'none', 'ninguno', 'test', 'prueba', 'demo',
  
  // Social media
  'instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'whatsapp',
  
  // Generic locations
  'bar', 'pub', 'club', 'discoteca', 'restaurante', 'cafeteria',
  'local', 'lugar', 'sitio', 'establecimiento',
];

/**
 * Check if a username is reserved
 */
export function isUsernameReserved(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase());
}

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
    // Check if username is reserved
    if (isUsernameReserved(username)) {
      console.log('[usernameGenerator] Username is reserved:', username);
      return false;
    }
    
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
 * Generate multiple username suggestions for a given name
 * Returns an array of available usernames
 */
export async function generateUsernameSuggestions(name: string, count: number = 5): Promise<string[]> {
  const suggestions: string[] = [];
  const baseUsername = generateUsernameFromName(name);
  
  console.log('[usernameGenerator] Generating', count, 'suggestions for:', name);
  
  // Try base username first
  const isBaseAvailable = await isUsernameAvailable(baseUsername);
  if (isBaseAvailable) {
    suggestions.push(baseUsername);
  }
  
  // Generate variations
  const variations = [
    baseUsername,
    `${baseUsername}_oficial`,
    `${baseUsername}_real`,
    `${baseUsername}_app`,
    `el_${baseUsername}`,
    `la_${baseUsername}`,
  ];
  
  // Add numbered variations
  for (let i = 1; i <= 99 && suggestions.length < count; i++) {
    variations.push(`${baseUsername}${i}`);
    variations.push(`${baseUsername}_${i}`);
  }
  
  // Check availability of variations
  for (const variation of variations) {
    if (suggestions.length >= count) break;
    
    const isAvailable = await isUsernameAvailable(variation);
    if (isAvailable && !suggestions.includes(variation)) {
      suggestions.push(variation);
    }
  }
  
  console.log('[usernameGenerator] Generated suggestions:', suggestions);
  return suggestions.slice(0, count);
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

/**
 * Search for users and locals by username
 * Returns both users and locals that match the search query
 */
export async function searchByUsername(query: string, limit: number = 10): Promise<{
  users: { id: string; username: string; nombre: string; avatar: string | null }[];
  locals: { id: string; username: string; nombre: string; imagen_url: string | null }[];
}> {
  try {
    const searchQuery = query.toLowerCase().trim();
    
    if (!searchQuery || searchQuery.length < 2) {
      return { users: [], locals: [] };
    }

    console.log('[usernameGenerator] 🔍 Searching for username:', searchQuery);

    // Search in usuarios table
    const { data: usersData, error: usersError } = await supabase
      .from('usuarios')
      .select('id, username, nombre, avatar')
      .ilike('username', `%${searchQuery}%`)
      .not('username', 'is', null)
      .limit(limit);

    if (usersError) {
      console.error('[usernameGenerator] Error searching users:', usersError);
    }

    // Search in locales table (only those with usernames - premium/estandar plans)
    const { data: localsData, error: localsError } = await supabase
      .from('locales')
      .select('id, username, nombre, imagen_url')
      .ilike('username', `%${searchQuery}%`)
      .not('username', 'is', null)
      .eq('perfil_visible', true)
      .limit(limit);

    if (localsError) {
      console.error('[usernameGenerator] Error searching locals:', localsError);
    }

    const results = {
      users: usersData || [],
      locals: localsData || [],
    };

    console.log('[usernameGenerator] ✅ Found', results.users.length, 'users and', results.locals.length, 'locals');
    
    return results;
  } catch (error) {
    console.error('[usernameGenerator] Error in searchByUsername:', error);
    return { users: [], locals: [] };
  }
}

/**
 * Get user or local by exact username
 * Returns the entity type and data
 */
export async function getUserOrLocalByUsername(username: string): Promise<{
  type: 'user' | 'local' | null;
  data: any;
}> {
  try {
    const normalizedUsername = username.toLowerCase().trim();
    
    console.log('[usernameGenerator] 🔍 Looking up username:', normalizedUsername);

    // Check usuarios first
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (userData) {
      console.log('[usernameGenerator] ✅ Found user:', userData.id);
      return { type: 'user', data: userData };
    }

    // Check locales
    const { data: localData, error: localError } = await supabase
      .from('locales')
      .select('*')
      .eq('username', normalizedUsername)
      .eq('perfil_visible', true)
      .maybeSingle();

    if (localData) {
      console.log('[usernameGenerator] ✅ Found local:', localData.id);
      return { type: 'local', data: localData };
    }

    console.log('[usernameGenerator] ❌ Username not found');
    return { type: null, data: null };
  } catch (error) {
    console.error('[usernameGenerator] Error in getUserOrLocalByUsername:', error);
    return { type: null, data: null };
  }
}

/**
 * Track username change in history table
 */
export async function trackUsernameChange(
  entityType: 'user' | 'local',
  entityId: string,
  oldUsername: string | null,
  newUsername: string,
  changedBy?: string,
  reason?: string
): Promise<boolean> {
  try {
    console.log('[usernameGenerator] 📝 Tracking username change:', {
      entityType,
      entityId,
      oldUsername,
      newUsername,
    });

    const { error } = await supabase
      .from('username_history')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        old_username: oldUsername,
        new_username: newUsername,
        changed_by: changedBy,
        change_reason: reason,
      });

    if (error) {
      console.error('[usernameGenerator] Error tracking username change:', error);
      return false;
    }

    console.log('[usernameGenerator] ✅ Username change tracked successfully');
    return true;
  } catch (error) {
    console.error('[usernameGenerator] Error in trackUsernameChange:', error);
    return false;
  }
}

/**
 * Get username change history for a user or local
 */
export async function getUsernameHistory(
  entityType: 'user' | 'local',
  entityId: string
): Promise<{
  id: string;
  old_username: string | null;
  new_username: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}[]> {
  try {
    console.log('[usernameGenerator] 📜 Fetching username history:', entityType, entityId);

    const { data, error } = await supabase
      .from('username_history')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[usernameGenerator] Error fetching history:', error);
      return [];
    }

    console.log('[usernameGenerator] ✅ Found', data?.length || 0, 'history records');
    return data || [];
  } catch (error) {
    console.error('[usernameGenerator] Error in getUsernameHistory:', error);
    return [];
  }
}
