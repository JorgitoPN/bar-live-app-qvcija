
import { createClient } from '@supabase/supabase-js';
import { supabaseStorage } from '@/src/lib/supabaseStorage';
import { Platform } from 'react-native';

// Use environment variables with fallback to hardcoded values
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://embntaqwlwmgazvrglaf.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing configuration');
  throw new Error('Missing Supabase environment variables');
}

console.log('[Supabase] Initializing client with AsyncStorage (Expo Go compatible)...');
console.log('[Supabase] To enable MMKV for production, set USE_MMKV=true in src/lib/supabaseStorage.ts');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      log_level: 'info',
    },
  },
});

/**
 * Check if Supabase is properly configured
 * Returns true if both URL and anon key are available
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY');
};

/**
 * ✅ v16.0: OPTIMIZACIÓN DE IMÁGENES - WebP con Compresión Agresiva
 * 
 * Transforma URLs de Supabase Storage para servir imágenes optimizadas:
 * - Formato WebP (reduce tamaño 25-35% vs JPEG)
 * - Compresión agresiva (quality 70 default, antes 80)
 * - Redimensionamiento dinámico (solo descarga el tamaño necesario)
 * - Cache-Control optimizado (reduce Egress)
 * - Fallback automático a JPEG para navegadores antiguos
 * 
 * @param imageUrl - URL original de la imagen en Supabase Storage
 * @param width - Ancho deseado en píxeles (opcional)
 * @param height - Alto deseado en píxeles (opcional)
 * @param quality - Calidad de compresión 1-100 (default: 70 - más compresión)
 * @returns URL optimizada con transformaciones de Supabase
 */
export const getOptimizedImageUrl = (
  imageUrl: string | undefined | null,
  width?: number,
  height?: number,
  quality: number = 70 // ✅ v16.0: Reduced from 80 to 70 for better compression
): string => {
  if (!imageUrl) {
    return '';
  }

  // Si no es una URL de Supabase Storage, retornar sin modificar
  if (!imageUrl.includes('supabase.co/storage')) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);
    
    // Construir parámetros de transformación
    const transformParams: string[] = [];
    
    // Formato WebP con fallback automático
    // Supabase detecta el User-Agent y sirve JPEG si el navegador no soporta WebP
    transformParams.push('format=webp');
    
    // Redimensionamiento (solo si se especifica)
    if (width) {
      transformParams.push(`width=${width}`);
    }
    if (height) {
      transformParams.push(`height=${height}`);
    }
    
    // Calidad de compresión (70 = buen balance entre tamaño y calidad)
    transformParams.push(`quality=${quality}`);
    
    // Añadir parámetros a la URL
    const separator = url.search ? '&' : '?';
    const optimizedUrl = `${imageUrl}${separator}${transformParams.join('&')}`;
    
    return optimizedUrl;
  } catch (error) {
    console.error('[Supabase] Error optimizing image URL:', error);
    return imageUrl;
  }
};

/**
 * ✅ HELPER: Obtener dimensiones óptimas para imágenes según el dispositivo
 * 
 * Calcula el tamaño de imagen óptimo basado en:
 * - Densidad de píxeles del dispositivo (PixelRatio)
 * - Ancho de pantalla
 * - Tipo de imagen (thumbnail, card, full)
 * 
 * @param type - Tipo de imagen: 'thumbnail' | 'card' | 'full'
 * @returns { width, height } - Dimensiones óptimas en píxeles
 */
export const getOptimalImageDimensions = (
  type: 'thumbnail' | 'card' | 'full' = 'card'
): { width: number; height: number } => {
  const screenWidth = Platform.select({
    web: 400, // Ancho típico de card en web
    default: 375, // Ancho típico de móvil
  });
  
  const pixelRatio = Platform.select({
    web: 1,
    default: 2, // Mayoría de dispositivos móviles son 2x o 3x
  });
  
  switch (type) {
    case 'thumbnail':
      return {
        width: Math.round(100 * pixelRatio),
        height: Math.round(100 * pixelRatio),
      };
    case 'card':
      return {
        width: Math.round(screenWidth * pixelRatio),
        height: Math.round(140 * pixelRatio), // Altura de LocalCard
      };
    case 'full':
      return {
        width: Math.round(screenWidth * pixelRatio),
        height: Math.round(screenWidth * pixelRatio * 1.5), // Ratio 2:3
      };
    default:
      return {
        width: Math.round(screenWidth * pixelRatio),
        height: Math.round(140 * pixelRatio),
      };
  }
};

/**
 * ✅ HELPER: Configurar headers de cache-control para uploads
 * 
 * Retorna headers optimizados para maximizar el uso de CDN cache:
 * - Cache-Control: public, max-age=31536000 (1 año)
 * - Immutable: true (el archivo nunca cambia)
 * 
 * @returns Headers para usar en supabase.storage.from().upload()
 */
export const getOptimizedUploadHeaders = () => {
  return {
    cacheControl: '31536000', // 1 año en segundos
    upsert: false, // No sobrescribir archivos existentes
  };
};
