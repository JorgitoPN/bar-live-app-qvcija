
import { supabase } from './supabase';

/**
 * Clean up expired story images from messages
 * This should be called periodically or when loading messages
 */
export async function cleanupExpiredStoryImages(): Promise<void> {
  try {
    console.log('[StoryCleanup] Starting cleanup of expired story images...');
    
    // Get all messages with story images where the story has expired
    const { data: expiredMessages, error: fetchError } = await supabase
      .from('mensajes')
      .select(`
        id,
        historia_id,
        historia_imagen,
        historias!inner (
          id,
          expires_at
        )
      `)
      .not('historia_imagen', 'is', null)
      .lt('historias.expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('[StoryCleanup] Error fetching expired messages:', fetchError);
      return;
    }

    if (!expiredMessages || expiredMessages.length === 0) {
      console.log('[StoryCleanup] No expired story images to clean up');
      return;
    }

    console.log(`[StoryCleanup] Found ${expiredMessages.length} messages with expired stories`);

    // Update messages to remove the story image
    const messageIds = expiredMessages.map(m => m.id);
    
    const { error: updateError } = await supabase
      .from('mensajes')
      .update({ historia_imagen: null })
      .in('id', messageIds);

    if (updateError) {
      console.error('[StoryCleanup] Error updating messages:', updateError);
      return;
    }

    console.log(`[StoryCleanup] Successfully cleaned up ${messageIds.length} expired story images`);
  } catch (error) {
    console.error('[StoryCleanup] Unexpected error:', error);
  }
}

/**
 * Check if a specific story has expired
 */
export async function isStoryExpired(storyId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('historias')
      .select('expires_at')
      .eq('id', storyId)
      .single();

    if (error || !data) {
      return true; // Assume expired if we can't fetch it
    }

    return new Date(data.expires_at) < new Date();
  } catch (error) {
    console.error('[StoryCleanup] Error checking story expiration:', error);
    return true;
  }
}

/**
 * Get the display text for an expired story message
 */
export function getExpiredStoryText(): string {
  return 'Esta historia ya no está disponible';
}
