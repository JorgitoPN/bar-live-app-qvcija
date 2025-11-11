
import { GooglePlaceDetails } from '@/types';
import { getGooglePlacePhotoUrl, getGoogleStreetViewUrl, checkStreetViewAvailability } from './googlePlacesApi';
import { incrementarContadorAPI } from './apiCostControl';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

/**
 * 🔍 VERIFICAR SI EL BUCKET DE SUPABASE EXISTE
 * Verifica que el bucket 'locales' esté creado y configurado
 */
export async function verificarBucketSupabase(): Promise<{ exists: boolean; error?: string }> {
  try {
    console.log('[Storage] Checking if Supabase bucket exists...');
    
    // Intentar listar archivos del bucket (esto fallará si no existe)
    const { data, error } = await supabase.storage
      .from('locales')
      .list('fotos', {
        limit: 1,
      });
    
    if (error) {
      if (error.message.includes('Bucket not found')) {
        console.error('[Storage] ❌ Bucket "locales" not found');
        return {
          exists: false,
          error: 'El bucket "locales" no existe en Supabase Storage. Por favor, créalo siguiendo la guía en docs/SUPABASE_STORAGE_SETUP.md'
        };
      }
      
      console.error('[Storage] Error checking bucket:', error);
      return {
        exists: false,
        error: `Error al verificar el bucket: ${error.message}`
      };
    }
    
    console.log('[Storage] ✅ Bucket "locales" exists and is accessible');
    return { exists: true };
  } catch (error) {
    console.error('[Storage] Unexpected error checking bucket:', error);
    return {
      exists: false,
      error: `Error inesperado: ${error}`
    };
  }
}

/**
 * 📸 DESCARGAR Y SUBIR FOTOS DE UN LOCAL A SUPABASE
 * Descarga fotos de Google Places y las sube a Supabase Storage
 * Si no hay fotos disponibles, usa Google Street View como fallback
 * 
 * IMPORTANTE: Las fotos se almacenan en Supabase para evitar llamadas continuas a la API de Google
 */
export async function descargarYSubirFotosLocal(
  localId: string,
  placeDetails: GooglePlaceDetails,
  maxFotos: number = 4
): Promise<string[]> {
  console.log('[Photos] Starting photo download and upload to Supabase...');
  
  // VERIFICAR QUE EL BUCKET EXISTE ANTES DE INTENTAR SUBIR
  const bucketCheck = await verificarBucketSupabase();
  if (!bucketCheck.exists) {
    console.error('[Photos] ❌ Cannot upload photos:', bucketCheck.error);
    throw new Error(bucketCheck.error || 'Bucket not found');
  }
  
  const fotosSubidas: string[] = [];
  
  // PASO 1: Intentar descargar fotos de Google Places
  if (placeDetails.photos && placeDetails.photos.length > 0) {
    const fotosADescargar = placeDetails.photos.slice(0, maxFotos);
    
    console.log(`[Photos] Downloading ${fotosADescargar.length} photos from Google Places...`);
    
    for (let i = 0; i < fotosADescargar.length; i++) {
      const photo = fotosADescargar[i];
      
      try {
        console.log(`[Photos] Downloading photo ${i + 1}/${fotosADescargar.length}...`);
        
        // Obtener URL de la foto de Google
        const photoUrl = getGooglePlacePhotoUrl(photo.photo_reference, 800);
        
        // ✅ INCREMENTAR CONTADOR (cada foto cuenta como 1 llamada)
        await incrementarContadorAPI(1);
        
        // Descargar la foto como base64 (compatible con React Native)
        const response = await fetch(photoUrl);
        if (!response.ok) {
          console.error(`[Photos] Failed to download photo ${i + 1}: ${response.status}`);
          continue;
        }
        
        // Convertir a base64
        const blob = await response.blob();
        const base64Data = await blobToBase64(blob);
        
        // Decodificar base64 a ArrayBuffer
        const arrayBuffer = decode(base64Data);
        
        // Subir a Supabase Storage
        const fileName = `${localId}_${i}_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('locales')
          .upload(`fotos/${fileName}`, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });
        
        if (uploadError) {
          console.error(`[Photos] Error uploading photo ${i + 1} to Supabase:`, uploadError);
          
          // Proporcionar mensaje más claro si es un error de bucket
          if (uploadError.message.includes('Bucket not found')) {
            console.error('[Photos] ❌ El bucket "locales" no existe. Crea el bucket en Supabase Dashboard.');
            throw new Error('Bucket "locales" no encontrado. Por favor, créalo en Supabase Storage.');
          }
          
          continue;
        }
        
        // Obtener URL pública de Supabase
        const { data: publicUrlData } = supabase.storage
          .from('locales')
          .getPublicUrl(`fotos/${fileName}`);
        
        if (publicUrlData?.publicUrl) {
          fotosSubidas.push(publicUrlData.publicUrl);
          console.log(`[Photos] ✅ Photo ${i + 1} uploaded to Supabase`);
        }
      } catch (error) {
        console.error(`[Photos] Error processing photo ${i + 1}:`, error);
        
        // Si es un error de bucket, propagar el error para detener el proceso
        if (error instanceof Error && error.message.includes('Bucket')) {
          throw error;
        }
      }
    }
  }
  
  // PASO 2: Si no hay fotos, intentar usar Google Street View
  if (fotosSubidas.length === 0 && placeDetails.geometry?.location) {
    console.log('[Photos] No photos available, trying Google Street View...');
    
    try {
      const lat = placeDetails.geometry.location.lat;
      const lng = placeDetails.geometry.location.lng;
      
      // Verificar si existe Street View para esta ubicación
      const streetViewAvailable = await checkStreetViewAvailability(lat, lng);
      
      if (streetViewAvailable) {
        console.log('[Photos] Street View available, downloading and uploading...');
        
        // Tomamos 4 vistas diferentes (norte, este, sur, oeste)
        const headings = [0, 90, 180, 270];
        const numViews = Math.min(maxFotos, headings.length);
        
        for (let i = 0; i < numViews; i++) {
          try {
            const streetViewUrl = getGoogleStreetViewUrl(
              lat,
              lng,
              800,
              600,
              headings[i],
              0,
              90
            );
            
            // Descargar Street View
            const response = await fetch(streetViewUrl);
            if (!response.ok) {
              console.error(`[Photos] Failed to download Street View ${i + 1}: ${response.status}`);
              continue;
            }
            
            // Convertir a base64
            const blob = await response.blob();
            const base64Data = await blobToBase64(blob);
            
            // Decodificar base64 a ArrayBuffer
            const arrayBuffer = decode(base64Data);
            
            // Subir a Supabase Storage
            const fileName = `${localId}_streetview_${i}_${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('locales')
              .upload(`fotos/${fileName}`, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: false,
              });
            
            if (uploadError) {
              console.error(`[Photos] Error uploading Street View ${i + 1} to Supabase:`, uploadError);
              
              // Proporcionar mensaje más claro si es un error de bucket
              if (uploadError.message.includes('Bucket not found')) {
                console.error('[Photos] ❌ El bucket "locales" no existe. Crea el bucket en Supabase Dashboard.');
                throw new Error('Bucket "locales" no encontrado. Por favor, créalo en Supabase Storage.');
              }
              
              continue;
            }
            
            // Obtener URL pública de Supabase
            const { data: publicUrlData } = supabase.storage
              .from('locales')
              .getPublicUrl(`fotos/${fileName}`);
            
            if (publicUrlData?.publicUrl) {
              fotosSubidas.push(publicUrlData.publicUrl);
              console.log(`[Photos] ✅ Street View photo ${i + 1} uploaded to Supabase (heading: ${headings[i]}°)`);
            }
          } catch (error) {
            console.error(`[Photos] Error processing Street View ${i + 1}:`, error);
            
            // Si es un error de bucket, propagar el error para detener el proceso
            if (error instanceof Error && error.message.includes('Bucket')) {
              throw error;
            }
          }
        }
        
        console.log(`[Photos] ✅ Generated and uploaded ${fotosSubidas.length} Street View photos`);
      } else {
        console.log('[Photos] ⚠️ Street View not available for this location');
      }
    } catch (error) {
      console.error('[Photos] Error generating Street View photos:', error);
      
      // Si es un error de bucket, propagar el error
      if (error instanceof Error && error.message.includes('Bucket')) {
        throw error;
      }
    }
  }
  
  console.log(`[Photos] ✅ Total photos uploaded to Supabase: ${fotosSubidas.length}`);
  return fotosSubidas;
}

/**
 * 📸 DESCARGAR Y SUBIR FOTOS DESDE URLs DE GOOGLE
 * Descarga fotos directamente desde URLs de Google y las sube a Supabase Storage
 * Útil para migrar fotos existentes que ya tienen URLs de Google
 */
export async function descargarYSubirFotosDesdeUrls(
  localId: string,
  urls: string[],
  maxFotos: number = 4
): Promise<string[]> {
  console.log(`[Photos] Starting photo download from ${urls.length} URLs...`);
  
  // VERIFICAR QUE EL BUCKET EXISTE ANTES DE INTENTAR SUBIR
  const bucketCheck = await verificarBucketSupabase();
  if (!bucketCheck.exists) {
    console.error('[Photos] ❌ Cannot upload photos:', bucketCheck.error);
    throw new Error(bucketCheck.error || 'Bucket not found');
  }
  
  const fotosSubidas: string[] = [];
  const urlsADescargar = urls.slice(0, maxFotos);
  
  for (let i = 0; i < urlsADescargar.length; i++) {
    const url = urlsADescargar[i];
    
    try {
      console.log(`[Photos] Downloading photo ${i + 1}/${urlsADescargar.length} from URL...`);
      
      // Descargar la foto
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[Photos] Failed to download photo ${i + 1}: ${response.status}`);
        continue;
      }
      
      // Convertir a base64
      const blob = await response.blob();
      const base64Data = await blobToBase64(blob);
      
      // Decodificar base64 a ArrayBuffer
      const arrayBuffer = decode(base64Data);
      
      // Subir a Supabase Storage
      const fileName = `${localId}_migrated_${i}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('locales')
        .upload(`fotos/${fileName}`, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      
      if (uploadError) {
        console.error(`[Photos] Error uploading photo ${i + 1} to Supabase:`, uploadError);
        
        // Proporcionar mensaje más claro si es un error de bucket
        if (uploadError.message.includes('Bucket not found')) {
          console.error('[Photos] ❌ El bucket "locales" no existe. Crea el bucket en Supabase Dashboard.');
          throw new Error('Bucket "locales" no encontrado. Por favor, créalo en Supabase Storage.');
        }
        
        continue;
      }
      
      // Obtener URL pública de Supabase
      const { data: publicUrlData } = supabase.storage
        .from('locales')
        .getPublicUrl(`fotos/${fileName}`);
      
      if (publicUrlData?.publicUrl) {
        fotosSubidas.push(publicUrlData.publicUrl);
        console.log(`[Photos] ✅ Photo ${i + 1} uploaded to Supabase`);
      }
    } catch (error) {
      console.error(`[Photos] Error processing photo ${i + 1}:`, error);
      
      // Si es un error de bucket, propagar el error para detener el proceso
      if (error instanceof Error && error.message.includes('Bucket')) {
        throw error;
      }
    }
  }
  
  console.log(`[Photos] ✅ Total photos uploaded to Supabase: ${fotosSubidas.length}`);
  return fotosSubidas;
}

/**
 * 📸 GENERAR METADATOS DE FOTOS (SIN DESCARGAR)
 * Solo genera los metadatos de las fotos para almacenar referencias
 * Las fotos NO se descargan, solo se guardan las referencias
 */
export function generarMetadatosFotos(
  placeDetails: GooglePlaceDetails,
  maxFotos: number = 4
): Array<{
  photo_reference: string;
  width: number;
  height: number;
  attributions: string[];
}> {
  console.log('[Photos] Generating photo metadata...');
  
  if (!placeDetails.photos || placeDetails.photos.length === 0) {
    console.log('[Photos] No photos available');
    return [];
  }
  
  const fotosMetadata = placeDetails.photos.slice(0, maxFotos).map((photo: any) => ({
    photo_reference: photo.photo_reference,
    width: photo.width,
    height: photo.height,
    attributions: photo.html_attributions || [],
  }));
  
  console.log(`[Photos] ✅ Generated metadata for ${fotosMetadata.length} photos`);
  return fotosMetadata;
}

/**
 * 🔧 HELPER: Convertir Blob a Base64 (compatible con React Native)
 * React Native no soporta blob.arrayBuffer(), así que usamos FileReader
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remover el prefijo "data:image/jpeg;base64," si existe
        const base64 = reader.result.split(',')[1] || reader.result;
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
