
/**
 * Story Preloader Utility
 * Preloads story images in the background for instant viewing
 */

import { Image } from 'react-native';

interface Story {
  id: string;
  imagen: string;
}

/**
 * Preload story images in the background
 * Call this when stories are loaded to prepare them for instant viewing
 */
export async function preloadStoryImages(stories: Story[], startIndex: number = 0, count: number = 5): Promise<void> {
  const imagesToPreload: string[] = [];
  
  // Preload from startIndex to startIndex + count
  for (let i = startIndex; i < Math.min(startIndex + count, stories.length); i++) {
    if (stories[i]?.imagen) {
      imagesToPreload.push(stories[i].imagen);
    }
  }
  
  if (imagesToPreload.length === 0) {
    return;
  }
  
  console.log('[StoryPreloader] 🚀 Preloading', imagesToPreload.length, 'story images...');
  
  try {
    const results = await Promise.allSettled(
      imagesToPreload.map(uri => Image.prefetch(uri))
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log('[StoryPreloader] ✅ Preloaded', successCount, '/', imagesToPreload.length, 'images');
  } catch (error) {
    console.log('[StoryPreloader] ⚠️ Error preloading images:', error);
  }
}

/**
 * Preload all story images for a user
 * Use this for the current user's own stories
 */
export async function preloadAllUserStories(stories: Story[]): Promise<void> {
  return preloadStoryImages(stories, 0, stories.length);
}

/**
 * Preload next batch of stories
 * Call this when user is viewing a story to prepare the next ones
 */
export async function preloadNextStories(stories: Story[], currentIndex: number, count: number = 3): Promise<void> {
  if (currentIndex + 1 >= stories.length) {
    return; // No more stories to preload
  }
  
  return preloadStoryImages(stories, currentIndex + 1, count);
}

/**
 * Check if an image is already cached
 */
export async function isImageCached(uri: string): Promise<boolean> {
  try {
    const result = await Image.queryCache([uri]);
    return result[uri] === 'disk' || result[uri] === 'memory';
  } catch {
    return false;
  }
}

/**
 * Clear story image cache
 * Use this to free up memory if needed
 */
export async function clearStoryCache(stories: Story[]): Promise<void> {
  const uris = stories.map(s => s.imagen).filter(Boolean);
  
  try {
    // Note: React Native doesn't have a direct way to clear specific images from cache
    // This is a placeholder for future implementation
    console.log('[StoryPreloader] Cache clearing not implemented yet');
  } catch (error) {
    console.log('[StoryPreloader] Error clearing cache:', error);
  }
}
