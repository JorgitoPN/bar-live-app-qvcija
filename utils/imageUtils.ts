
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IMAGE OPTIMIZATION UTILITIES v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 OBJETIVO: Optimizar imágenes mediante transformación server-side
 * 
 * ✅ CARACTERÍSTICAS:
 * 1️⃣ SERVER-SIDE TRANSFORMATION: Supabase Storage Image Transformations
 * 2️⃣ AUTOMATIC DETECTION: Detecta URLs de Supabase automáticamente
 * 3️⃣ FALLBACK SAFE: Devuelve URL original si no es de Supabase
 * 4️⃣ CONFIGURABLE: Ancho y calidad personalizables
 * 5️⃣ NULL SAFE: Maneja URLs nulas/undefined correctamente
 * 
 * 🚀 USO:
 * const optimizedUrl = getOptimizedImageUrl(originalUrl, 400, 70);
 * 
 * 📊 FORMATO SUPABASE:
 * Original: https://[project].supabase.co/storage/v1/object/public/bucket/path/image.jpg
 * Optimized: https://[project].supabase.co/storage/v1/render/image/public/bucket/path/image.jpg?width=400&quality=70
 */

/**
 * Optimiza una URL de imagen de Supabase Storage añadiendo parámetros de transformación
 * 
 * @param url - URL original de la imagen (puede ser null/undefined)
 * @param width - Ancho deseado en píxeles (default: 400)
 * @param quality - Calidad de compresión 1-100 (default: 70)
 * @returns URL optimizada o undefined si la URL es nula
 * 
 * @example
 * // Optimizar imagen principal de tarjeta
 * const optimizedUrl = getOptimizedImageUrl(venue.imagen_url, 400, 70);
 * 
 * // Optimizar galería de imágenes
 * const optimizedGallery = venue.imagenes.map(url => getOptimizedImageUrl(url, 800, 80));
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number = 400,
  quality: number = 70
): string | undefined {
  // ✅ NULL SAFETY: Retornar undefined si no hay URL
  if (!url) {
    return undefined;
  }

  // ✅ SUPABASE DETECTION: Verificar si es una URL de Supabase Storage
  // Formato esperado: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  const supabaseStoragePattern = /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//;
  
  if (!supabaseStoragePattern.test(url)) {
    // ✅ FALLBACK: Si no es de Supabase, devolver URL original
    console.log('[imageUtils] 📸 URL no es de Supabase, usando original:', url.substring(0, 50) + '...');
    return url;
  }

  try {
    // ✅ TRANSFORMATION: Aplicar transformación de Supabase
    // Formato: /storage/v1/render/image/public/[bucket]/[path]?width=X&quality=Y
    
    // Extraer la parte después de /public/
    const publicIndex = url.indexOf('/public/');
    if (publicIndex === -1) {
      console.warn('[imageUtils] ⚠️ URL de Supabase sin /public/, usando original');
      return url;
    }

    // Construir URL optimizada
    const baseUrl = url.substring(0, publicIndex);
    const pathAfterPublic = url.substring(publicIndex + '/public/'.length);
    
    // Formato de transformación de Supabase Storage
    const optimizedUrl = `${baseUrl}/render/image/public/${pathAfterPublic}?width=${width}&quality=${quality}`;
    
    console.log('[imageUtils] ✅ Imagen optimizada:', {
      original: url.substring(0, 50) + '...',
      optimized: optimizedUrl.substring(0, 50) + '...',
      width,
      quality
    });
    
    return optimizedUrl;
  } catch (error) {
    // ✅ ERROR HANDLING: En caso de error, devolver URL original
    console.error('[imageUtils] ❌ Error optimizando imagen:', error);
    return url;
  }
}

/**
 * Optimiza un array de URLs de imágenes
 * 
 * @param urls - Array de URLs originales
 * @param width - Ancho deseado en píxeles (default: 400)
 * @param quality - Calidad de compresión 1-100 (default: 70)
 * @returns Array de URLs optimizadas
 * 
 * @example
 * const optimizedGallery = getOptimizedImageUrls(venue.galeria_urls, 800, 80);
 */
export function getOptimizedImageUrls(
  urls: (string | null | undefined)[] | null | undefined,
  width: number = 400,
  quality: number = 70
): string[] {
  if (!urls || !Array.isArray(urls)) {
    return [];
  }

  return urls
    .map(url => getOptimizedImageUrl(url, width, quality))
    .filter((url): url is string => url !== undefined);
}

/**
 * Obtiene la URL optimizada para diferentes tamaños de pantalla
 * 
 * @param url - URL original de la imagen
 * @param size - Tamaño predefinido: 'thumbnail' | 'card' | 'detail' | 'full'
 * @returns URL optimizada según el tamaño
 * 
 * @example
 * const thumbnailUrl = getOptimizedImageUrlBySize(venue.imagen_url, 'thumbnail');
 * const detailUrl = getOptimizedImageUrlBySize(venue.imagen_url, 'detail');
 */
export function getOptimizedImageUrlBySize(
  url: string | null | undefined,
  size: 'thumbnail' | 'card' | 'detail' | 'full'
): string | undefined {
  const sizeConfig = {
    thumbnail: { width: 200, quality: 60 },
    card: { width: 400, quality: 70 },
    detail: { width: 800, quality: 80 },
    full: { width: 1200, quality: 85 },
  };

  const config = sizeConfig[size];
  return getOptimizedImageUrl(url, config.width, config.quality);
}
