
import { GooglePlaceDetails } from '@/types';
import { getGooglePlacePhotoUrl, getGoogleStreetViewUrl, checkStreetViewAvailability } from './googlePlacesApi';
import { incrementarContadorAPI } from './apiCostControl';

/**
 * 📸 DESCARGAR FOTOS DE UN LOCAL
 * Descarga y almacena las fotos de Google Places
 * Si no hay fotos disponibles, usa Google Street View como fallback
 */
export async function descargarFotosLocal(
  placeDetails: GooglePlaceDetails,
  maxFotos: number = 4
): Promise<string[]> {
  console.log('[Photos] Starting photo download...');
  
  const fotosSubidas: string[] = [];
  
  // PASO 1: Intentar descargar fotos de Google Places
  if (placeDetails.photos && placeDetails.photos.length > 0) {
    const fotosADescargar = placeDetails.photos.slice(0, maxFotos);
    
    console.log(`[Photos] Downloading ${fotosADescargar.length} photos from Google Places...`);
    
    for (let i = 0; i < fotosADescargar.length; i++) {
      const photo = fotosADescargar[i];
      
      try {
        console.log(`[Photos] Downloading photo ${i + 1}/${fotosADescargar.length}...`);
        
        // Obtener URL de la foto
        const photoUrl = getGooglePlacePhotoUrl(photo.photo_reference, 800);
        
        // ✅ INCREMENTAR CONTADOR (cada foto cuenta como 1 llamada)
        await incrementarContadorAPI(1);
        
        // En producción: descargar y subir a storage
        // const blob = await fetch(photoUrl).then(r => r.blob());
        // const file = new File([blob], `${placeDetails.place_id}_${i}.jpg`);
        // const uploaded = await base44.integrations.Core.UploadFile({ file });
        // fotosSubidas.push(uploaded.file_url);
        
        // Por ahora, usar URL directa de Google (mock)
        fotosSubidas.push(photoUrl);
        
        console.log(`[Photos] ✅ Photo ${i + 1} downloaded`);
      } catch (error) {
        console.error(`[Photos] Error downloading photo ${i + 1}:`, error);
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
        console.log('[Photos] Street View available, generating URL...');
        
        // Generar URL de Street View
        // Tomamos 4 vistas diferentes (norte, este, sur, oeste)
        const headings = [0, 90, 180, 270];
        const numViews = Math.min(maxFotos, headings.length);
        
        for (let i = 0; i < numViews; i++) {
          const streetViewUrl = getGoogleStreetViewUrl(
            lat,
            lng,
            800,
            600,
            headings[i], // Dirección de la cámara
            0, // Pitch (horizontal)
            90 // Campo de visión
          );
          
          fotosSubidas.push(streetViewUrl);
          console.log(`[Photos] ✅ Street View photo ${i + 1} generated (heading: ${headings[i]}°)`);
        }
        
        console.log(`[Photos] ✅ Generated ${fotosSubidas.length} Street View photos`);
      } else {
        console.log('[Photos] ⚠️ Street View not available for this location');
      }
    } catch (error) {
      console.error('[Photos] Error generating Street View photos:', error);
    }
  }
  
  console.log(`[Photos] ✅ Total photos: ${fotosSubidas.length}`);
  return fotosSubidas;
}
