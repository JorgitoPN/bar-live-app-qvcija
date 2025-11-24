
/**
 * Story Cleanup Utility
 * Automatically delete expired stories and their images from storage
 */

import { supabase } from './supabase';

/**
 * Clean up expired stories (older than 24 hours)
 * Deletes both database records and storage files
 */
export async function cleanupExpiredStories(): Promise<void> {
  try {
    console.log('[StoryCleanup] 🧹 Starting cleanup of expired stories...');

    // Get all expired stories (older than 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredStories, error: fetchError } = await supabase
      .from('historias')
      .select('id, imagen')
      .lt('created_at', twentyFourHoursAgo);

    if (fetchError) {
      console.error('[StoryCleanup] Error fetching expired stories:', fetchError);
      return;
    }

    if (!expiredStories || expiredStories.length === 0) {
      console.log('[StoryCleanup] ✅ No expired stories to clean up');
      return;
    }

    console.log('[StoryCleanup] Found', expiredStories.length, 'expired stories to delete');

    // Delete images from storage
    const imagesToDelete: string[] = [];
    for (const story of expiredStories) {
      if (story.imagen) {
        // Extract filename from URL
        const imagePath = story.imagen.split('/').pop();
        if (imagePath) {
          imagesToDelete.push(imagePath);
        }
      }
    }

    if (imagesToDelete.length > 0) {
      console.log('[StoryCleanup] 🗑️ Deleting', imagesToDelete.length, 'images from storage...');
      
      const { error: storageError } = await supabase.storage
        .from('historias')
        .remove(imagesToDelete);

      if (storageError) {
        console.error('[StoryCleanup] Error deleting images from storage:', storageError);
      } else {
        console.log('[StoryCleanup] ✅ Deleted', imagesToDelete.length, 'images from storage');
      }
    }

    // Delete stories from database
    const storyIds = expiredStories.map(s => s.id);
    
    const { error: deleteError } = await supabase
      .from('historias')
      .delete()
      .in('id', storyIds);

    if (deleteError) {
      console.error('[StoryCleanup] Error deleting stories from database:', deleteError);
      return;
    }

    console.log('[StoryCleanup] ✅ Successfully deleted', expiredStories.length, 'expired stories');
  } catch (error) {
    console.error('[StoryCleanup] Unexpected error:', error);
  }
}

/**
 * Delete a specific story and its image from storage
 */
export async function deleteStory(storyId: string, imageUrl?: string): Promise<boolean> {
  try {
    console.log('[StoryCleanup] 🗑️ Deleting story:', storyId);

    // Delete image from storage if provided
    if (imageUrl) {
      const imagePath = imageUrl.split('/').pop();
      if (imagePath) {
        const { error: storageError } = await supabase.storage
          .from('historias')
          .remove([imagePath]);

        if (storageError) {
          console.error('[StoryCleanup] Error deleting image from storage:', storageError);
        } else {
          console.log('[StoryCleanup] ✅ Deleted image from storage');
        }
      }
    }

    // Delete story from database
    const { error: deleteError } = await supabase
      .from('historias')
      .delete()
      .eq('id', storyId);

    if (deleteError) {
      console.error('[StoryCleanup] Error deleting story from database:', deleteError);
      return false;
    }

    console.log('[StoryCleanup] ✅ Successfully deleted story');
    return true;
  } catch (error) {
    console.error('[StoryCleanup] Unexpected error:', error);
    return false;
  }
}

/**
 * Delete a post and its images from storage
 */
export async function deletePost(postId: string, imageUrls?: string[]): Promise<boolean> {
  try {
    console.log('[StoryCleanup] 🗑️ Deleting post:', postId);

    // Delete images from storage if provided
    if (imageUrls && imageUrls.length > 0) {
      const imagePaths = imageUrls
        .map(url => url.split('/').pop())
        .filter(Boolean) as string[];

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('posts')
          .remove(imagePaths);

        if (storageError) {
          console.error('[StoryCleanup] Error deleting images from storage:', storageError);
        } else {
          console.log('[StoryCleanup] ✅ Deleted', imagePaths.length, 'images from storage');
        }
      }
    }

    // Delete post from database
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('[StoryCleanup] Error deleting post from database:', deleteError);
      return false;
    }

    console.log('[StoryCleanup] ✅ Successfully deleted post');
    return true;
  } catch (error) {
    console.error('[StoryCleanup] Unexpected error:', error);
    return false;
  }
}

/**
 * Schedule automatic cleanup to run periodically
 * Call this when the app starts
 */
export function scheduleStoryCleanup(): void {
  // Run cleanup immediately
  cleanupExpiredStories();

  // Run cleanup every hour
  setInterval(() => {
    cleanupExpiredStories();
  }, 60 * 60 * 1000); // 1 hour

  console.log('[StoryCleanup] ✅ Scheduled automatic cleanup every hour');
}
