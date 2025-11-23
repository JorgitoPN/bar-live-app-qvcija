
import { supabase } from './supabase';
import { extractMentions } from './textParser';

/**
 * Process and store mentions for a story
 * Stories don't have text content, so mentions must be explicitly provided
 */
export async function processStoryMentions(
  historiaId: string,
  mentionedUserIds: string[],
  mentionedLocalIds: string[]
): Promise<void> {
  if (mentionedUserIds.length === 0 && mentionedLocalIds.length === 0) return;

  try {
    console.log('[StoryHelpers] Processing mentions for story:', historiaId);

    // Process user mentions
    for (const userId of mentionedUserIds) {
      const { data: user } = await supabase
        .from('usuarios')
        .select('username, nombre')
        .eq('id', userId)
        .eq('activo', true)
        .single();

      if (user) {
        const { error } = await supabase
          .from('historia_mentions')
          .insert({
            historia_id: historiaId,
            usuario_id: userId,
            username: user.username || user.nombre,
          });

        if (error && error.code !== '23505') {
          console.error('[StoryHelpers] Error inserting user mention:', error);
        }

        // Create notification for mentioned user
        await supabase.from('notificaciones').insert({
          usuario_id: userId,
          tipo: 'mencion',
          titulo: 'Te mencionaron en una historia',
          mensaje: `Te mencionaron en una historia`,
        });
      }
    }

    // Process local mentions
    for (const localId of mentionedLocalIds) {
      const { data: local } = await supabase
        .from('locales')
        .select('nombre')
        .eq('id', localId)
        .eq('activo', true)
        .single();

      if (local) {
        const { error } = await supabase
          .from('historia_mentions')
          .insert({
            historia_id: historiaId,
            local_id: localId,
            username: local.nombre,
          });

        if (error && error.code !== '23505') {
          console.error('[StoryHelpers] Error inserting local mention:', error);
        }
      }
    }

    console.log('[StoryHelpers] ✅ Story mentions processed successfully');
  } catch (error) {
    console.error('[StoryHelpers] Error processing story mentions:', error);
  }
}

/**
 * Get mentioned users/locals for a story
 */
export async function getStoryMentions(historiaId: string): Promise<{
  id: string;
  nombre: string;
  username: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}[]> {
  try {
    const { data, error } = await supabase
      .from('historia_mentions')
      .select(`
        usuario_id,
        local_id,
        username,
        usuarios:usuario_id(nombre, username, avatar),
        locales:local_id(nombre, imagen_url)
      `)
      .eq('historia_id', historiaId);

    if (error) {
      console.error('[StoryHelpers] Error loading story mentions:', error);
      return [];
    }

    const mentions = (data || []).map((m: any) => {
      if (m.usuario_id && m.usuarios) {
        return {
          id: m.usuario_id,
          nombre: m.usuarios.nombre,
          username: m.usuarios.username || m.usuarios.nombre,
          avatar: m.usuarios.avatar,
          tipo: 'usuario' as const,
        };
      } else if (m.local_id && m.locales) {
        return {
          id: m.local_id,
          nombre: m.locales.nombre,
          username: m.locales.nombre,
          avatar: m.locales.imagen_url,
          tipo: 'local' as const,
        };
      }
      return null;
    }).filter(Boolean);

    return mentions;
  } catch (error) {
    console.error('[StoryHelpers] Error getting story mentions:', error);
    return [];
  }
}
