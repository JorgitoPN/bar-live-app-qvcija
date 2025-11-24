
/**
 * Image Optimization Utility
 * Compress and optimize images before upload to reduce storage and improve performance
 */

import * as ImageManipulator from 'expo-image-manipulator';

interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png';
}

/**
 * Optimize an image for upload
 * Reduces file size while maintaining visual quality
 */
export async function optimizeImage(
  uri: string,
  options: OptimizationOptions = {}
): Promise<string> {
  try {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.8, // 80% quality - good balance between size and quality
      format = 'jpeg',
    } = options;

    console.log('[ImageOptimization] 📸 Optimizing image:', uri);

    // Resize and compress image
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: quality,
        format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
      }
    );

    console.log('[ImageOptimization] ✅ Image optimized successfully');
    return result.uri;
  } catch (error) {
    console.error('[ImageOptimization] Error optimizing image:', error);
    // Return original URI if optimization fails
    return uri;
  }
}

/**
 * Optimize multiple images in parallel
 */
export async function optimizeImages(
  uris: string[],
  options: OptimizationOptions = {}
): Promise<string[]> {
  try {
    console.log('[ImageOptimization] 📸 Optimizing', uris.length, 'images...');

    const optimizedUris = await Promise.all(
      uris.map(uri => optimizeImage(uri, options))
    );

    console.log('[ImageOptimization] ✅ All images optimized successfully');
    return optimizedUris;
  } catch (error) {
    console.error('[ImageOptimization] Error optimizing images:', error);
    // Return original URIs if optimization fails
    return uris;
  }
}

/**
 * Optimize image for story (smaller size, faster loading)
 */
export async function optimizeStoryImage(uri: string): Promise<string> {
  return optimizeImage(uri, {
    maxWidth: 1080,
    maxHeight: 1920,
    quality: 0.85,
    format: 'jpeg',
  });
}

/**
 * Optimize image for post (high quality)
 */
export async function optimizePostImage(uri: string): Promise<string> {
  return optimizeImage(uri, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: 'jpeg',
  });
}

/**
 * Optimize image for avatar (small size)
 */
export async function optimizeAvatarImage(uri: string): Promise<string> {
  return optimizeImage(uri, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.9,
    format: 'jpeg',
  });
}

/**
 * Get estimated file size reduction
 */
export function getEstimatedSizeReduction(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  quality: number
): number {
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio, 1);
  
  // Estimate size reduction based on resize ratio and quality
  const pixelReduction = ratio * ratio;
  const qualityReduction = quality;
  
  return pixelReduction * qualityReduction;
}
