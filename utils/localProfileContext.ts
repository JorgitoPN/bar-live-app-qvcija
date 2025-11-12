
import { supabase } from './supabase';

/**
 * Helper to get the display information for a post/story/comment author
 * based on whether it's a user or local post
 */
export async function getAuthorDisplayInfo(
  tipo: 'usuario' | 'local',
  autorId: string,
  localId?: string | null
): Promise<{
  nombre: string;
  avatar?: string;
  username?: string;
}> {
  if (tipo === 'local' && localId) {
    // Fetch local info
    const { data: localData, error } = await supabase
      .from('locales')
      .select('nombre, imagen_url')
      .eq('id', localId)
      .single();

    if (!error && localData) {
      return {
        nombre: localData.nombre,
        avatar: localData.imagen_url,
        username: localData.nombre,
      };
    }
  }

  // Fetch user info (fallback or for user posts)
  const { data: userData, error } = await supabase
    .from('usuarios')
    .select('nombre, avatar, username')
    .eq('id', autorId)
    .single();

  if (!error && userData) {
    return userData;
  }

  // Fallback
  return {
    nombre: 'Usuario',
    avatar: undefined,
    username: undefined,
  };
}

/**
 * Check if the current user owns a piece of content (post, story, comment, event)
 */
export function checkContentOwnership(
  contentTipo: 'usuario' | 'local',
  contentAutorId: string,
  contentLocalId: string | null | undefined,
  currentUserId: string,
  activeLocalProfileId: string | null | undefined
): boolean {
  if (contentTipo === 'usuario') {
    // User content - check if autor_id matches current user
    return contentAutorId === currentUserId;
  } else if (contentTipo === 'local') {
    // Local content - check if the current user is interacting as this local
    return activeLocalProfileId === contentLocalId;
  }
  
  return false;
}

/**
 * Verify if the current user is the owner of a local
 */
export async function verifyLocalOwnership(
  localId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('locales')
      .select('propietario_id')
      .eq('id', localId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.propietario_id === userId;
  } catch (error) {
    console.error('[LocalProfileContext] Error verifying local ownership:', error);
    return false;
  }
}
