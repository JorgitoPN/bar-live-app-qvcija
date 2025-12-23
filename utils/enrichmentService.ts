
import { convertirHorarios, estaAbiertoAhora } from './enrichmentSchedules';
import { esLocalValido, validarDistancia } from './enrichmentValidation';
import { descargarFotosLocal } from './enrichmentPhotos';
import { validarLocalCompleto } from './localTypesBackend';
import {
  extraerServiciosCompletos,
  extraerAmbienteCompleto,
  extraerClientelaCompleta,
  extraerMetodosPagoCompletos,
  analizarReviews,
} from './enrichmentExtraction';
import {
  extraerServiciosDisponiblesCompletos,
  extraerTiposCocina,
  extraerMusicaPrincipal,
  extraerAmbienteCompleto as extraerAmbienteCompletoNuevo,
  extraerClientela,
  extraerMetodosPagoCompletos as extraerMetodosPagoCompletosNuevo,
  extraerAnalisisReviews,
} from './enrichmentServicesExtraction';
import { LocalCatalogo, EnrichmentResult, GooglePlaceDetails, LocalCategory } from '@/types';
import {
  googlePlacesTextSearch,
  googlePlacesNearby,
  googlePlacesDetails,
} from './googlePlacesApi';
import { mapGoogleTypesToBarlive, categorizarPorHorarios, mapearNivelPrecio } from './enrichmentMapping';
import { addPubCategoryIfNeeded } from './categorizeLocal';
import { verificarLocalExcluido } from './enrichmentExclusionCheck';

/**
 * Interfaz para datos enriquecidos de un local
 */
export interface LocalEnriquecido {
  google_place_id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  telefono?: string;
  telefono_internacional?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  
  // 🎯 Categorización mejorada
  barlive_types: string[];
  barlive_type: string;
  tipos_google: string[];
  
  // 💰 Nivel de precio
  nivel_precio_google?: number;
  rango_precios?: string;
  
  // 🔗 Enlaces importantes
  google_maps_url?: string;
  plus_code?: string;
  plus_code_compound?: string;
  
  // 📅 Horarios
  horarios: Record<string, string[]>;
  horarios_texto?: string[];
  abierto_ahora?: boolean;
  estado_actual?: string;
  
  // 🏷️ Atributos
  servicios: Record<string, boolean>;
  servicios_disponibles: Record<string, boolean>;
  ambiente: Record<string, boolean>;
  ambiente_completo: Record<string, boolean>;
  clientela: Record<string, boolean>;
  metodos_pago: Record<string, boolean>;
  metodos_pago_completos: Record<string, boolean>;
  
  // 🍴 Cocina y música
  tipos_cocina: string[];
  musica_principal: string;
  descripcion_google?: string;
  
  // 🧠 Análisis de reviews
  analisis_reviews: {
    palabras_clave_detectadas: string[];
    sentimiento_general: string;
    puntuacion_media_reviews: number;
    volumen_reviews: number;
    idioma_predominante: string;
    fuente: string[];
    palabras_destacadas_google: string[];
    resumen_automatico: string;
  };
  
  // 📸 Fotos
  fotos: string[];
  fotos_google?: any[];
  
  // 📝 Otros
  google_url?: string;
  business_status?: string;
  editorial_summary?: string;
  reviews_google?: any[];
}

/**
 * 🔍 BUSCAR Y ENRIQUECER LOCAL
 * Implementa las 4 estrategias de búsqueda en Google Places
 */
export async function buscarYEnriquecerLocal(
  localCatalogo: LocalCatalogo
): Promise<EnrichmentResult & { datosEnriquecidos?: LocalEnriquecido }> {
  console.log('[Enrichment] ========================================');
  console.log('[Enrichment] Starting enrichment for:', localCatalogo.nombre);
  console.log('[Enrichment] OSM ID:', localCatalogo.osm_id);

  try {
    // 🚫 VERIFICAR SI EL LOCAL ESTÁ EXCLUIDO
    console.log('[Enrichment] Checking if local is excluded...');
    const exclusionCheck = await verificarLocalExcluido({
      nombre: localCatalogo.nombre,
      latitud: localCatalogo.latitud,
      longitud: localCatalogo.longitud,
      osm_id: localCatalogo.osm_id,
    });

    if (exclusionCheck.excluido) {
      console.log('[Enrichment] ❌ Local is excluded from enrichment');
      console.log('[Enrichment] Reason:', exclusionCheck.motivo);
      return {
        success: false,
        localCatalogoId: localCatalogo.id,
        notas: `Local excluido: ${exclusionCheck.motivo}`,
      };
    }
    console.log('[Enrichment] ✅ Local is not excluded, proceeding with enrichment');

    // 🔍 ESTRATEGIA 1: Búsqueda por nombre + provincia
    console.log('[Enrichment] Strategy 1: Name + Province');
    let result = await googlePlacesTextSearch(
      `${localCatalogo.nombre} ${localCatalogo.provincia} España`
    );

    // 🔍 ESTRATEGIA 2: Búsqueda por nombre + dirección
    if (!result) {
      console.log('[Enrichment] Strategy 2: Name + Address');
      result = await googlePlacesTextSearch(
        `${localCatalogo.nombre} ${localCatalogo.direccion} ${localCatalogo.provincia}`
      );
    }

    // 🔍 ESTRATEGIA 3: Búsqueda por proximidad
    if (!result) {
      console.log('[Enrichment] Strategy 3: Nearby Search');
      result = await googlePlacesNearby({
        location: `${localCatalogo.latitud},${localCatalogo.longitud}`,
        radius: 50,
        keyword: localCatalogo.nombre,
      });
    }

    // 🔍 ESTRATEGIA 4: Búsqueda ampliada por proximidad
    if (!result) {
      console.log('[Enrichment] Strategy 4: Extended Nearby Search');
      result = await googlePlacesNearby({
        location: `${localCatalogo.latitud},${localCatalogo.longitud}`,
        radius: 100,
        keyword: localCatalogo.nombre,
      });
    }

    // ❌ No encontrado en Google Places
    if (!result) {
      console.log('[Enrichment] ❌ Not found in Google Places');
      return {
        success: false,
        localCatalogoId: localCatalogo.id,
        notas: 'No encontrado en Google Places',
      };
    }

    console.log('[Enrichment] ✅ Found in Google Places');
    console.log('[Enrichment] Place ID:', result.place_id);

    // 📋 OBTENER DETALLES COMPLETOS
    console.log('[Enrichment] Fetching complete details...');
    const placeDetails = await googlePlacesDetails(result.place_id, [
      'name',
      'formatted_address',
      'geometry',
      'rating',
      'user_ratings_total',
      'website',
      'formatted_phone_number',
      'international_phone_number',
      'opening_hours',
      'photos',
      'types',
      'price_level',
      'url',
      'reviews',
      'editorial_summary',
      'business_status',
      'plus_code',
    ]);

    if (!placeDetails) {
      console.log('[Enrichment] ❌ Failed to get place details');
      return {
        success: false,
        localCatalogoId: localCatalogo.id,
        notas: 'Error al obtener detalles de Google Places',
      };
    }

    // ✅ VALIDAR LOCAL CON SISTEMA DE DISCRIMINACIÓN
    console.log('[Enrichment] Validating place with discrimination system...');
    const validacionCompleta = validarLocalCompleto(placeDetails);

    if (!validacionCompleta.valido) {
      console.log('[Enrichment] ❌ Place validation failed:', validacionCompleta.razon);
      return {
        success: false,
        localCatalogoId: localCatalogo.id,
        notas: `Rechazado: ${validacionCompleta.razon}`,
      };
    }
    
    // ✅ VALIDAR LOCAL (validación adicional)
    console.log('[Enrichment] Additional validation...');
    const validacion = esLocalValido(placeDetails);

    if (!validacion.valido) {
      console.log('[Enrichment] ❌ Additional validation failed:', validacion.razon);
      return {
        success: false,
        localCatalogoId: localCatalogo.id,
        notas: `Rechazado: ${validacion.razon}`,
      };
    }

    // ✅ VALIDAR DISTANCIA
    const distanciaValida = validarDistancia(
      localCatalogo.latitud,
      localCatalogo.longitud,
      placeDetails.geometry.location.lat,
      placeDetails.geometry.location.lng,
      200 // 200 metros máximo
    );

    if (!distanciaValida) {
      console.log('[Enrichment] ⚠️ Distance validation failed (>200m)');
      // No rechazar, pero marcar
    }

    // 🧠 MAPEAR TIPOS
    console.log('[Enrichment] Mapping types...');
    let barliveTypes = mapGoogleTypesToBarlive(placeDetails.types || [], placeDetails.name);

    // 🧠 CATEGORIZAR POR HORARIOS
    if (placeDetails.opening_hours) {
      console.log('[Enrichment] Categorizing by schedules...');
      barliveTypes = categorizarPorHorarios(placeDetails.opening_hours, barliveTypes);
    }

    // 📅 CONVERTIR HORARIOS (necesario para la lógica de PUB)
    console.log('[Enrichment] Converting schedules...');
    const horarios = convertirHorarios(placeDetails.opening_hours);
    
    // 🍺 AÑADIR CATEGORÍA PUB SI CIERRA DESPUÉS DE LAS 2:00 AM
    console.log('[Enrichment] Checking if PUB category should be added...');
    barliveTypes = addPubCategoryIfNeeded(barliveTypes as LocalCategory[], horarios) as string[];
    console.log('[Enrichment] Final types after PUB check:', barliveTypes);

    // 🏷️ TIPO PRINCIPAL
    const barliveType = barliveTypes[0] || 'bar';

    // 💰 NIVEL DE PRECIO
    const nivelPrecio = placeDetails.price_level;
    const rangoPrecio = mapearNivelPrecio(nivelPrecio);

    // 🔗 ENLACES IMPORTANTES
    const googleMapsUrl = placeDetails.url;
    const plusCode = placeDetails.plus_code?.global_code;
    const plusCodeCompound = placeDetails.plus_code?.compound_code;

    // 📅 HORARIOS (ya convertidos anteriormente)
    const horariosTexto = placeDetails.opening_hours?.weekday_text || [];
    const abiertoAhora = estaAbiertoAhora(horarios);
    
    // 🕐 ESTADO ACTUAL
    let estadoActual = 'desconocido';
    if (placeDetails.opening_hours) {
      if (placeDetails.opening_hours.open_now === true) {
        estadoActual = 'abierto_ahora';
      } else if (placeDetails.opening_hours.open_now === false) {
        estadoActual = 'cerrado_ahora';
      }
    }
    if (placeDetails.business_status === 'CLOSED_TEMPORARILY') {
      estadoActual = 'cerrado_temporalmente';
    }

    // 🏷️ EXTRAER ATRIBUTOS
    console.log('[Enrichment] Extracting attributes...');
    const servicios = extraerServiciosCompletos(placeDetails, barliveTypes);
    const serviciosDisponibles = extraerServiciosDisponiblesCompletos(placeDetails, barliveTypes);
    const ambienteViejo = extraerAmbienteCompleto(placeDetails, barliveTypes);
    const ambienteNuevo = extraerAmbienteCompletoNuevo(placeDetails, barliveTypes);
    const ambiente = { ...ambienteViejo, ...ambienteNuevo };
    const clientelaVieja = extraerClientelaCompleta(placeDetails);
    const clientelaNueva = extraerClientela(placeDetails, barliveTypes);
    const clientela = { ...clientelaVieja, ...clientelaNueva };
    const metodosPagoViejos = extraerMetodosPagoCompletos(placeDetails);
    const metodosPagoNuevos = extraerMetodosPagoCompletosNuevo(placeDetails);
    const metodosPago = { ...metodosPagoViejos, ...metodosPagoNuevos };
    
    // 🍴 EXTRAER COCINA Y MÚSICA
    console.log('[Enrichment] Extracting cuisine and music...');
    const tiposCocina = extraerTiposCocina(placeDetails);
    const musicaPrincipal = extraerMusicaPrincipal(placeDetails, barliveTypes);
    
    // 🧠 ANALIZAR REVIEWS
    console.log('[Enrichment] Analyzing reviews...');
    const analisisReviewsViejo = analizarReviews(placeDetails);
    const analisisReviewsNuevo = extraerAnalisisReviews(placeDetails);
    const analisisReviews = {
      ...analisisReviewsViejo,
      palabras_clave_detectadas: analisisReviewsNuevo.palabras_clave_detectadas,
      sentimiento_general: analisisReviewsNuevo.sentimiento_general,
      puntuacion_media_reviews: analisisReviewsNuevo.puntuacion_media_reviews,
      volumen_reviews: analisisReviewsNuevo.volumen_reviews,
      idioma_predominante: analisisReviewsNuevo.idioma_predominante,
      resumen_automatico: analisisReviewsNuevo.resumen_automatico,
    };

    // 💬 PROCESAR REVIEWS (primeras 5)
    const reviewsGoogle = placeDetails.reviews?.slice(0, 5).map((review: any) => ({
      author_name: review.author_name,
      author_photo: review.profile_photo_url,
      rating: review.rating,
      text: review.text,
      time: review.time,
      relative_time_description: review.relative_time_description,
      language: review.language,
    })) || [];

    // 📸 METADATOS DE FOTOS (no descargar aún)
    const fotosGoogle = placeDetails.photos?.slice(0, 4).map((photo: any) => ({
      photo_reference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
      attributions: photo.html_attributions || [],
    })) || [];

    // 📸 DESCARGAR FOTOS (URLs temporales de Google)
    console.log('[Enrichment] Downloading photos...');
    const fotos = await descargarFotosLocal(placeDetails, 4);

    // 💾 CREAR DATOS ENRIQUECIDOS
    const datosEnriquecidos: LocalEnriquecido = {
      google_place_id: placeDetails.place_id,
      nombre: placeDetails.name,
      direccion: placeDetails.formatted_address,
      latitud: placeDetails.geometry.location.lat,
      longitud: placeDetails.geometry.location.lng,
      telefono: placeDetails.formatted_phone_number,
      telefono_internacional: placeDetails.international_phone_number,
      website: placeDetails.website,
      rating: placeDetails.rating,
      user_ratings_total: placeDetails.user_ratings_total,
      price_level: placeDetails.price_level,
      
      // 🎯 Categorización mejorada
      barlive_types: barliveTypes,
      barlive_type: barliveType,
      tipos_google: placeDetails.types || [],
      
      // 💰 Nivel de precio
      nivel_precio_google: nivelPrecio,
      rango_precios: rangoPrecio,
      
      // 🔗 Enlaces importantes
      google_maps_url: googleMapsUrl,
      plus_code: plusCode,
      plus_code_compound: plusCodeCompound,
      
      // 📅 Horarios
      horarios: horarios,
      horarios_texto: horariosTexto,
      abierto_ahora: abiertoAhora,
      estado_actual: estadoActual,
      
      // 🏷️ Atributos
      servicios: servicios,
      servicios_disponibles: serviciosDisponibles,
      ambiente: ambiente,
      ambiente_completo: ambiente,
      clientela: clientela,
      metodos_pago: metodosPago,
      metodos_pago_completos: metodosPago,
      
      // 🍴 Cocina y música
      tipos_cocina: tiposCocina,
      musica_principal: musicaPrincipal,
      descripcion_google: placeDetails.editorial_summary?.overview,
      
      // 🧠 Análisis de reviews
      analisis_reviews: analisisReviews,
      
      // 📸 Fotos
      fotos: fotos,
      fotos_google: fotosGoogle,
      
      // 📝 Otros
      google_url: placeDetails.url,
      business_status: placeDetails.business_status,
      editorial_summary: placeDetails.editorial_summary?.overview,
      reviews_google: reviewsGoogle,
    };

    console.log('[Enrichment] ✅ Enrichment completed successfully');
    console.log('[Enrichment] Rating:', datosEnriquecidos.rating);
    console.log('[Enrichment] Price level:', datosEnriquecidos.nivel_precio_google, datosEnriquecidos.rango_precios);
    console.log('[Enrichment] Photos:', datosEnriquecidos.fotos.length);
    console.log('[Enrichment] Types:', datosEnriquecidos.barlive_types);
    console.log('[Enrichment] Cuisine:', datosEnriquecidos.tipos_cocina);
    console.log('[Enrichment] Music:', datosEnriquecidos.musica_principal);
    console.log('[Enrichment] Sentiment:', datosEnriquecidos.analisis_reviews.sentimiento_general);
    console.log('[Enrichment] Google Maps URL:', datosEnriquecidos.google_maps_url);
    console.log('[Enrichment] Plus Code:', datosEnriquecidos.plus_code);
    console.log('[Enrichment] ========================================');

    return {
      success: true,
      localCatalogoId: localCatalogo.id,
      google_place_id: placeDetails.place_id,
      strategy_used: 'Google Places API',
      datosEnriquecidos: datosEnriquecidos,
    };
  } catch (error) {
    console.error('[Enrichment] Error:', error);
    return {
      success: false,
      localCatalogoId: localCatalogo.id,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * 📦 PROCESAR LOTE DE ENRIQUECIMIENTO
 * Procesa múltiples locales en secuencia con rate limiting
 */
export async function procesarLoteEnriquecimiento(
  candidatos: LocalCatalogo[],
  onProgress?: (
    actual: number,
    total: number,
    resultado: EnrichmentResult & { datosEnriquecidos?: LocalEnriquecido }
  ) => void
): Promise<(EnrichmentResult & { datosEnriquecidos?: LocalEnriquecido })[]> {
  console.log('[Batch] ========================================');
  console.log('[Batch] Starting batch enrichment');
  console.log('[Batch] Total candidates:', candidatos.length);

  const resultados: (EnrichmentResult & { datosEnriquecidos?: LocalEnriquecido })[] = [];

  for (let i = 0; i < candidatos.length; i++) {
    const candidato = candidatos[i];
    
    console.log(`[Batch] Processing ${i + 1}/${candidatos.length}: ${candidato.nombre}`);

    try {
      // Enriquecer local
      const resultado = await buscarYEnriquecerLocal(candidato);
      resultados.push(resultado);

      // Notificar progreso
      if (onProgress) {
        onProgress(i + 1, candidatos.length, resultado);
      }

      // Rate limiting: esperar 300ms entre llamadas
      if (i < candidatos.length - 1) {
        console.log('[Batch] Rate limiting: waiting 300ms...');
        await sleep(300);
      }
    } catch (error) {
      console.error(`[Batch] Error processing ${candidato.nombre}:`, error);
      
      const errorResult: EnrichmentResult & { datosEnriquecidos?: LocalEnriquecido } = {
        success: false,
        localCatalogoId: candidato.id,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
      
      resultados.push(errorResult);
      
      if (onProgress) {
        onProgress(i + 1, candidatos.length, errorResult);
      }
    }
  }

  console.log('[Batch] ========================================');
  console.log('[Batch] Batch enrichment completed');
  console.log('[Batch] Successful:', resultados.filter(r => r.success).length);
  console.log('[Batch] Failed:', resultados.filter(r => !r.success).length);
  console.log('[Batch] ========================================');

  return resultados;
}

/**
 * Utilidad: Sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
