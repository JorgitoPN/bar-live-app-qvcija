
/**
 * Avatar Validator Utility
 * Validates and fixes avatar URLs to ensure they are accessible
 */

import { supabase } from './supabase';

/**
 * Check if an avatar URL is valid (not a local file path)
 */
export function isValidAvatarUrl(avatarUrl: string | null | undefined): boolean {
  if (!avatarUrl) return false;
  
  // Check if it's a local file path (iOS or Android)
  if (avatarUrl.startsWith('file://')) {
    console.log('[AvatarValidator] ❌ Invalid avatar: local file path detected');
    return false;
  }
  
  // Check if it's a valid HTTP/HTTPS URL
  if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
    console.log('[AvatarValidator] ❌ Invalid avatar: not a valid URL');
    return false;
  }
  
  return true;
}

/**
 * Get a fallback avatar URL based on user's name
 */
export function getFallbackAvatarUrl(nombre: string): string {
  // Use a default avatar from Unsplash
  const initial = nombre.charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&size=200&background=random&color=fff&bold=true`;
}

/**
 * Fix invalid avatar URLs in the database
 */
export async function fixInvalidAvatars(): Promise<number> {
  try {
    console.log('[AvatarValidator] 🔍 Checking for invalid avatar URLs...');
    
    // Get all users with avatars
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, nombre, avatar')
      .not('avatar', 'is', null);
    
    if (error) {
      console.error('[AvatarValidator] Error fetching users:', error);
      return 0;
    }
    
    let fixedCount = 0;
    
    for (const user of users || []) {
      if (!isValidAvatarUrl(user.avatar)) {
        console.log('[AvatarValidator] 🔧 Fixing invalid avatar for user:', user.nombre);
        
        // Set avatar to null so the app shows the fallback
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ avatar: null })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('[AvatarValidator] Error updating user:', updateError);
        } else {
          console.log('[AvatarValidator] ✅ Avatar fixed for user:', user.nombre);
          fixedCount++;
        }
      }
    }
    
    console.log('[AvatarValidator] ✅ Fixed', fixedCount, 'invalid avatars');
    return fixedCount;
    
  } catch (error) {
    console.error('[AvatarValidator] Error:', error);
    return 0;
  }
}

/**
 * Validate avatar URL before saving to database
 */
export function validateAvatarBeforeSave(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  
  if (isValidAvatarUrl(avatarUrl)) {
    return avatarUrl;
  }
  
  console.log('[AvatarValidator] ⚠️ Invalid avatar URL detected, returning null');
  return null;
}
