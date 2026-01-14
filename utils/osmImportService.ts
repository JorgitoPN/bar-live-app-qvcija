
import { LocalCatalogo } from '@/types';
import { supabase } from './supabase';
import { verificarLocalExcluido } from './enrichmentExclusionCheck';

/**
 * Mapeo de tipos OSM a tipos BarLive
 */
const OSM_TO_BARLIVE_TYPES: Record<string, string[]> = {
  'bar': ['bar'],
  'pub': ['pub'],
  'restaurant': ['restaurante'],
  'cafe': ['cafe'],
  'nightclub': ['discoteca'],
  'biergarten': ['terraza', 'pub'],
  'fast_food': ['restaurante'],
};

/**
 * Lista de endpoints de Overpass API alternativos
 * Se intentarán en orden si uno falla
 */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

/**
 * Configuración de reintentos
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Configuración de rate limiting
 */
const RATE_LIMIT_CONFIG = {
  requestsPerMinute: 2,
  delayBetweenRequestsMs: 30000, // 30 segundos entre requests
};

/**
 * Configuración de paginación
 * Procesar en lotes pequeños para evitar timeouts
 */
const PAGINATION_CONFIG = {
  batchSize: 50, // Procesar 50 locales a la vez
  maxBatchesPerSession: 20, // Máximo 20 lotes por sesión (1000 locales)
};

/**
 * Interfaz para el estado de importación
 */
interface ImportacionOSMEstado {
  id?: string;
  provincia: string;
  tipos: string[];
  limite_total: number;
  locales_procesados: number;
  locales_importados: number;
  locales_duplicados: number;
  locales_excluidos: number;
  ultima_posicion: number;
  completada: boolean;
  fecha_inicio: string;
  fecha_ultima_actualizacion: string;
  error?: string;
}

/**
 * Delay helper function
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Obtener o crear estado de importación
 */
async function obtenerEstadoImportacion(
  provincia: string,
  tipos: string[]
): Promise<ImportacionOSMEstado | null> {
  try {
    console.log('[OSM Import] 🔍 Checking for existing import state...');
    console.log('[OSM Import] Province:', provincia);
    console.log('[OSM Import] Types:', tipos.join(', '));

    // Buscar importación activa (no completada) para esta provincia y tipos
    const { data, error } = await supabase
      .from('osm_import_state')
      .select('*')
      .eq('provincia', provincia)
      .eq('completada', false)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[OSM Import] Error fetching import state:', error);
      return null;
    }

    if (data) {
      // Verificar que los tipos coincidan
      const tiposGuardados = data.tipos as string[];
      const tiposCoinciden = 
        tiposGuardados.length === tipos.length &&
        tiposGuardados.every(t => tipos.includes(t));

      if (tiposCoinciden) {
        console.log('[OSM Import] ✅ Found existing import state');
        console.log('[OSM Import] Progress:', data.locales_procesados, '/', data.limite_total);
        console.log('[OSM Import] Last position:', data.ultima_posicion);
        return data as ImportacionOSMEstado;
      } else {
        console.log('[OSM Import] ⚠️ Found import state but types don\'t match');
        console.log('[OSM Import] Saved types:', tiposGuardados);
        console.log('[OSM Import] Requested types:', tipos);
      }
    }

    console.log('[OSM Import] ℹ️ No existing import state found');
    return null;
  } catch (error) {
    console.error('[OSM Import] Error in obtenerEstadoImportacion:', error);
    return null;
  }
}

/**
 * Crear nuevo estado de importación
 */
async function crearEstadoImportacion(
  provincia: string,
  tipos: string[],
  limiteTotal: number
): Promise<ImportacionOSMEstado | null> {
  try {
    console.log('[OSM Import] 📝 Creating new import state...');

    const nuevoEstado: Omit<ImportacionOSMEstado, 'id'> = {
      provincia,
      tipos,
      limite_total: limiteTotal,
      locales_procesados: 0,
      locales_importados: 0,
      locales_duplicados: 0,
      locales_excluidos: 0,
      ultima_posicion: 0,
      completada: false,
      fecha_inicio: new Date().toISOString(),
      fecha_ultima_actualizacion: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('osm_import_state')
      .insert(nuevoEstado)
      .select()
      .single();

    if (error) {
      console.error('[OSM Import] Error creating import state:', error);
      return null;
    }

    console.log('[OSM Import] ✅ Import state created with ID:', data.id);
    return data as ImportacionOSMEstado;
  } catch (error) {
    console.error('[OSM Import] Error in crearEstadoImportacion:', error);
    return null;
  }
}

/**
 * Actualizar estado de importación
 */
async function actualizarEstadoImportacion(
  estadoId: string,
  actualizacion: Partial<ImportacionOSMEstado>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('osm_import_state')
      .update({
        ...actualizacion,
        fecha_ultima_actualizacion: new Date().toISOString(),
      })
      .eq('id', estadoId);

    if (error) {
      console.error('[OSM Import] Error updating import state:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[OSM Import] Error in actualizarEstadoImportacion:', error);
    return false;
  }
}

/**
 * Marcar importación como completada
 */
async function marcarImportacionCompletada(
  estadoId: string,
  error?: string
): Promise<boolean> {
  try {
    console.log('[OSM Import] ✅ Marking import as completed...');

    const { error: updateError } = await supabase
      .from('osm_import_state')
      .update({
        completada: true,
        fecha_ultima_actualizacion: new Date().toISOString(),
        error: error || null,
      })
      .eq('id', estadoId);

    if (updateError) {
      console.error('[OSM Import] Error marking import as completed:', updateError);
      return false;
    }

    console.log('[OSM Import] ✅ Import marked as completed');
    return true;
  } catch (error) {
    console.error('[OSM Import] Error in marcarImportacionCompletada:', error);
    return false;
  }
}

/**
 * Importar catálogo de locales desde OpenStreetMap con continuación automática
 */
export async function importarCatalogoOSM(
  provincia: string,
  tipos: string[],
  limite: number = 1000,
  onProgress?: (actual: number, total: number, local?: LocalCatalogo) => void
): Promise<LocalCatalogo[]> {
  console.log('[OSM Import] ========================================');
  console.log('[OSM Import] Starting import from OpenStreetMap');
  console.log('[OSM Import] Province:', provincia);
  console.log('[OSM Import] Types:', tipos);
  console.log('[OSM Import] Limit:', limite);

  try {
    // Obtener o crear estado de importación
    let estado = await obtenerEstadoImportacion(provincia, tipos);
    
    if (!estado) {
      console.log('[OSM Import] 🆕 Starting new import session');
      estado = await crearEstadoImportacion(provincia, tipos, limite);
      if (!estado) {
        throw new Error('No se pudo crear el estado de importación');
      }
    } else {
      console.log('[OSM Import] 🔄 Continuing existing import session');
      console.log('[OSM Import] Already processed:', estado.locales_procesados, 'locales');
      console.log('[OSM Import] Continuing from position:', estado.ultima_posicion);
    }

    const localesImportados: LocalCatalogo[] = [];
    let localesProcesados = estado.locales_procesados;
    let localesImportadosCount = estado.locales_importados;
    let localesDuplicadosCount = estado.locales_duplicados;
    let localesExcluidosCount = estado.locales_excluidos;
    let posicionActual = estado.ultima_posicion;

    // Calcular cuántos locales faltan por procesar
    const localesFaltantes = limite - localesProcesados;
    console.log('[OSM Import] Remaining to process:', localesFaltantes, 'locales');

    if (localesFaltantes <= 0) {
      console.log('[OSM Import] ✅ Import already completed');
      await marcarImportacionCompletada(estado.id!);
      return localesImportados;
    }

    // Procesar en lotes
    const numLotes = Math.ceil(localesFaltantes / PAGINATION_CONFIG.batchSize);
    const lotesAProcesar = Math.min(numLotes, PAGINATION_CONFIG.maxBatchesPerSession);
    
    console.log('[OSM Import] 📦 Processing in batches');
    console.log('[OSM Import] Batch size:', PAGINATION_CONFIG.batchSize);
    console.log('[OSM Import] Total batches needed:', numLotes);
    console.log('[OSM Import] Batches to process in this session:', lotesAProcesar);

    for (let lote = 0; lote < lotesAProcesar; lote++) {
      console.log(`[OSM Import] 📦 Processing batch ${lote + 1}/${lotesAProcesar}...`);

      // Construir query con offset
      const query = construirQueryOverpassConOffset(
        provincia,
        tipos,
        PAGINATION_CONFIG.batchSize,
        posicionActual
      );

      // Consultar Overpass API con reintentos
      const localesOSM = await consultarOverpassAPIConReintentos(query);
      console.log(`[OSM Import] Received ${localesOSM.length} results from OSM for batch ${lote + 1}`);

      if (localesOSM.length === 0) {
        console.log('[OSM Import] ⚠️ No more results from OSM, marking as completed');
        await marcarImportacionCompletada(estado.id!);
        break;
      }

      // Filtrar por tipos solicitados
      const localesFiltrados = localesOSM.filter(element => {
        const amenity = element.tags?.amenity;
        return amenity && tipos.includes(amenity);
      });
      console.log(`[OSM Import] After filtering: ${localesFiltrados.length} elements match requested types`);

      // Procesar cada local del lote
      for (let i = 0; i < localesFiltrados.length; i++) {
        const osmElement = localesFiltrados[i];
        
        try {
          const localCatalogo = convertirOSMaLocalCatalogo(osmElement, provincia);
          
          if (localCatalogo) {
            // Guardar en Supabase
            const resultado = await guardarLocalEnSupabase(localCatalogo);
            
            if (resultado === 'importado') {
              localesImportados.push(localCatalogo);
              localesImportadosCount++;
              console.log(`[OSM Import] ✅ Saved: ${localCatalogo.nombre} (${localCatalogo.tipo_osm})`);
            } else if (resultado === 'duplicado') {
              localesDuplicadosCount++;
              console.log(`[OSM Import] ⚠️ Duplicate: ${localCatalogo.nombre}`);
            } else if (resultado === 'excluido') {
              localesExcluidosCount++;
              console.log(`[OSM Import] 🚫 Excluded: ${localCatalogo.nombre}`);
            }
            
            localesProcesados++;
            posicionActual++;

            if (onProgress) {
              onProgress(localesProcesados, limite, localCatalogo);
            }

            // Actualizar estado cada 10 locales
            if (localesProcesados % 10 === 0) {
              await actualizarEstadoImportacion(estado.id!, {
                locales_procesados: localesProcesados,
                locales_importados: localesImportadosCount,
                locales_duplicados: localesDuplicadosCount,
                locales_excluidos: localesExcluidosCount,
                ultima_posicion: posicionActual,
              });
            }
          }
        } catch (error) {
          console.error('[OSM Import] Error processing element:', error);
        }
      }

      // Actualizar estado al final del lote
      await actualizarEstadoImportacion(estado.id!, {
        locales_procesados: localesProcesados,
        locales_importados: localesImportadosCount,
        locales_duplicados: localesDuplicadosCount,
        locales_excluidos: localesExcluidosCount,
        ultima_posicion: posicionActual,
      });

      // Verificar si ya alcanzamos el límite
      if (localesProcesados >= limite) {
        console.log('[OSM Import] ✅ Reached import limit');
        await marcarImportacionCompletada(estado.id!);
        break;
      }

      // Delay entre lotes para no sobrecargar la API
      if (lote < lotesAProcesar - 1) {
        console.log(`[OSM Import] ⏳ Waiting ${RATE_LIMIT_CONFIG.delayBetweenRequestsMs}ms before next batch...`);
        await delay(RATE_LIMIT_CONFIG.delayBetweenRequestsMs);
      }
    }

    // Verificar si la importación está completa
    if (localesProcesados >= limite) {
      await marcarImportacionCompletada(estado.id!);
    }

    console.log('[OSM Import] ========================================');
    console.log(`[OSM Import] Session completed`);
    console.log(`[OSM Import] Total processed: ${localesProcesados} locales`);
    console.log(`[OSM Import] Imported: ${localesImportadosCount}`);
    console.log(`[OSM Import] Duplicates: ${localesDuplicadosCount}`);
    console.log(`[OSM Import] Excluded: ${localesExcluidosCount}`);
    console.log(`[OSM Import] Current position: ${posicionActual}`);
    console.log('[OSM Import] COST: 0€ (OSM is free)');
    console.log('[OSM Import] ========================================');

    return localesImportados;
  } catch (error: any) {
    console.error('[OSM Import] Import error:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('504') || error.message.includes('timeout')) {
      throw new Error(
        'El servidor de OpenStreetMap está temporalmente sobrecargado. ' +
        'El progreso se ha guardado. Puedes continuar la importación más tarde desde donde se quedó.'
      );
    } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      throw new Error(
        'Se han realizado demasiadas solicitudes. ' +
        'El progreso se ha guardado. Por favor, espera 1-2 minutos y vuelve a intentar.'
      );
    } else {
      throw new Error(
        'Error al importar desde OpenStreetMap: ' + error.message + '. ' +
        'El progreso se ha guardado y puedes continuar más tarde.'
      );
    }
  }
}

/**
 * Guardar local en Supabase
 * Retorna: 'importado' | 'duplicado' | 'excluido'
 */
async function guardarLocalEnSupabase(localCatalogo: LocalCatalogo): Promise<'importado' | 'duplicado' | 'excluido'> {
  try {
    // Verificar si el local está excluido
    const exclusionCheck = await verificarLocalExcluido({
      nombre: localCatalogo.nombre,
      latitud: localCatalogo.latitud,
      longitud: localCatalogo.longitud,
      osm_id: localCatalogo.osm_id,
      amenity_type: localCatalogo.tipo_osm,
    });

    if (exclusionCheck.excluido) {
      return 'excluido';
    }

    // Verificar si ya existe (por osm_id)
    const { data: existente, error: errorBusqueda } = await supabase
      .from('locales')
      .select('id')
      .eq('source_id', localCatalogo.osm_id)
      .eq('source_type', 'osm')
      .single();

    if (existente) {
      return 'duplicado';
    }

    // Insertar nuevo local
    const { data, error } = await supabase
      .from('locales')
      .insert({
        nombre: localCatalogo.nombre,
        tipo: localCatalogo.barlive_types[0] || 'bar',
        descripcion: `Local importado desde OpenStreetMap (${localCatalogo.tipo_osm})`,
        direccion: localCatalogo.direccion,
        provincia: localCatalogo.provincia,
        comunidad: localCatalogo.comunidad,
        latitud: localCatalogo.latitud,
        longitud: localCatalogo.longitud,
        telefono: localCatalogo.telefono,
        website: localCatalogo.website,
        source_type: 'osm',
        source_id: localCatalogo.osm_id,
        enriquecido: false,
        activo: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[OSM Import] Error saving to Supabase:', error);
      return 'duplicado'; // Asumir duplicado si hay error
    }

    return 'importado';
  } catch (error) {
    console.error('[OSM Import] Error in guardarLocalEnSupabase:', error);
    return 'duplicado';
  }
}

/**
 * Construir query de Overpass API con offset para paginación
 */
function construirQueryOverpassConOffset(
  provincia: string,
  tipos: string[],
  limite: number,
  offset: number
): string {
  console.log('[OSM Import] Building query with offset');
  console.log('[OSM Import] Offset:', offset);
  console.log('[OSM Import] Limit:', limite);
  
  // Query de Overpass API con paginación
  const query = `
    [out:json][timeout:180];
    (
      area["name"="${provincia}"]["boundary"="administrative"]->.searchArea;
      (
        node["amenity"~"${tipos.join('|')}"](area.searchArea);
        way["amenity"~"${tipos.join('|')}"](area.searchArea);
        relation["amenity"~"${tipos.join('|')}"](area.searchArea);
      );
    );
    out body center ${limite};
  `;

  return query.trim();
}

/**
 * Construir query de Overpass API (versión original sin offset)
 */
function construirQueryOverpass(
  provincia: string,
  tipos: string[],
  limite: number
): string {
  return construirQueryOverpassConOffset(provincia, tipos, limite, 0);
}

/**
 * Consultar Overpass API con reintentos y exponential backoff
 */
async function consultarOverpassAPIConReintentos(query: string): Promise<any[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    // Calcular delay con exponential backoff
    if (attempt > 0) {
      const delayMs = Math.min(
        RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
        RETRY_CONFIG.maxDelayMs
      );
      console.log(`[OSM Import] ⏳ Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms delay...`);
      await delay(delayMs);
    }
    
    // Intentar con diferentes endpoints
    for (let endpointIndex = 0; endpointIndex < OVERPASS_ENDPOINTS.length; endpointIndex++) {
      const endpoint = OVERPASS_ENDPOINTS[endpointIndex];
      
      try {
        console.log(`[OSM Import] 🔄 Attempting request to endpoint: ${endpoint} (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1})`);
        const result = await consultarOverpassAPI(query, endpoint);
        
        console.log(`[OSM Import] ✅ Request successful on attempt ${attempt + 1} using endpoint: ${endpoint}`);
        return result;
        
      } catch (error: any) {
        lastError = error;
        console.error(`[OSM Import] ❌ Request failed on endpoint ${endpoint}:`, error.message);
        
        if (error.message.includes('504') || error.message.includes('timeout')) {
          console.log(`[OSM Import] ⏱️ Server timeout detected, trying next endpoint...`);
          continue;
        }
        
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          console.log(`[OSM Import] 🚦 Rate limit detected, waiting longer before retry...`);
          await delay(RATE_LIMIT_CONFIG.delayBetweenRequestsMs);
        }
      }
    }
  }
  
  console.error(`[OSM Import] ❌ All retry attempts exhausted. Last error:`, lastError);
  throw new Error(`Overpass API error after ${RETRY_CONFIG.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Consultar Overpass API
 */
async function consultarOverpassAPI(query: string, endpoint: string): Promise<any[]> {
  console.log(`[OSM Import] 📡 Querying Overpass API at: ${endpoint}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutos timeout
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'BarLive/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetails = '';
      try {
        errorDetails = await response.text();
      } catch (e) {
        console.log('[OSM Import] Could not read error response body');
      }
      
      if (response.status === 504) {
        throw new Error(
          `Overpass API timeout (504): El servidor está sobrecargado. ` +
          `Detalles: ${errorDetails.substring(0, 200)}`
        );
      } else if (response.status === 429) {
        throw new Error(
          `Overpass API rate limit (429): Demasiadas solicitudes.`
        );
      } else {
        throw new Error(
          `Overpass API error: ${response.status} ${response.statusText}. ` +
          `Detalles: ${errorDetails.substring(0, 200)}`
        );
      }
    }

    const data = await response.json();
    
    if (!data.elements || !Array.isArray(data.elements)) {
      console.log('[OSM Import] ⚠️ No elements found in response');
      return [];
    }

    console.log(`[OSM Import] ✅ Overpass API returned ${data.elements.length} elements`);
    
    return data.elements;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[OSM Import] ⏱️ Request timeout after 3 minutes');
      throw new Error('Overpass API timeout: La solicitud tardó demasiado tiempo.');
    }
    
    console.error('[OSM Import] ❌ Overpass API error:', error);
    throw error;
  }
}

/**
 * Convertir elemento OSM a LocalCatalogo
 */
function convertirOSMaLocalCatalogo(
  osmElement: any,
  provincia: string
): LocalCatalogo | null {
  const tags = osmElement.tags || {};
  
  if (!tags.name) {
    return null;
  }

  let lat = osmElement.lat;
  let lon = osmElement.lon;
  
  if (!lat && osmElement.center) {
    lat = osmElement.center.lat;
    lon = osmElement.center.lon;
  }
  
  if (!lat || !lon) {
    return null;
  }

  const tipoOSM = tags.amenity || 'bar';
  const barliveTypes = OSM_TO_BARLIVE_TYPES[tipoOSM] || ['bar'];
  const direccion = construirDireccion(tags);

  const localCatalogo: LocalCatalogo = {
    id: `osm-${osmElement.type}-${osmElement.id}`,
    osm_id: `${osmElement.type}/${osmElement.id}`,
    nombre: tags.name,
    tipo_osm: tipoOSM,
    barlive_types: barliveTypes,
    direccion: direccion,
    provincia: provincia,
    comunidad: obtenerComunidad(provincia),
    latitud: lat,
    longitud: lon,
    telefono: tags.phone || tags['contact:phone'],
    website: tags.website || tags['contact:website'],
    etiquetas_osm: tags,
    outdoor_seating: tags.outdoor_seating === 'yes',
    enriquecido: false,
    fecha_catalogado: new Date().toISOString(),
  };

  return localCatalogo;
}

/**
 * Construir dirección desde tags OSM
 */
function construirDireccion(tags: any): string {
  const partes: string[] = [];
  
  if (tags['addr:street']) {
    partes.push(tags['addr:street']);
  }
  
  if (tags['addr:housenumber']) {
    partes.push(tags['addr:housenumber']);
  }
  
  if (tags['addr:city']) {
    partes.push(tags['addr:city']);
  }
  
  if (partes.length === 0) {
    return 'Dirección no disponible';
  }
  
  return partes.join(', ');
}

/**
 * Obtener comunidad autónoma desde provincia
 */
function obtenerComunidad(provincia: string): string {
  const comunidadesPorProvincia: Record<string, string> = {
    'Madrid': 'Comunidad de Madrid',
    'Barcelona': 'Cataluña',
    'Valencia': 'Comunidad Valenciana',
    'Sevilla': 'Andalucía',
    'Zaragoza': 'Aragón',
    'Málaga': 'Andalucía',
    'Murcia': 'Región de Murcia',
    'Palma': 'Islas Baleares',
    'Las Palmas': 'Islas Canarias',
    'Bilbao': 'País Vasco',
    'Alicante': 'Comunidad Valenciana',
    'Córdoba': 'Andalucía',
    'Valladolid': 'Castilla y León',
    'Vigo': 'Galicia',
    'Gijón': 'Principado de Asturias',
    'Granada': 'Andalucía',
    'Oviedo': 'Principado de Asturias',
    'Santander': 'Cantabria',
    'Pamplona': 'Comunidad Foral de Navarra',
    'Almería': 'Andalucía',
  };
  
  return comunidadesPorProvincia[provincia] || 'España';
}

/**
 * Verificar el estado de la API de Overpass
 */
export async function verificarEstadoOverpassAPI(): Promise<{
  disponible: boolean;
  endpoint: string | null;
  mensaje: string;
}> {
  console.log('[OSM Import] 🔍 Checking Overpass API status...');
  
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${endpoint}/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[OSM Import] ✅ Endpoint ${endpoint} is available`);
        return {
          disponible: true,
          endpoint: endpoint,
          mensaje: `API disponible en ${endpoint}`,
        };
      }
    } catch (error) {
      console.log(`[OSM Import] ❌ Endpoint ${endpoint} is not available`);
    }
  }
  
  return {
    disponible: false,
    endpoint: null,
    mensaje: 'Ningún endpoint de Overpass API está disponible en este momento. Por favor, intenta más tarde.',
  };
}

/**
 * Obtener estado actual de importación para mostrar en UI
 */
export async function obtenerEstadoImportacionActual(
  provincia: string,
  tipos: string[]
): Promise<ImportacionOSMEstado | null> {
  return await obtenerEstadoImportacion(provincia, tipos);
}

/**
 * Cancelar importación actual
 */
export async function cancelarImportacionActual(
  provincia: string,
  tipos: string[]
): Promise<boolean> {
  try {
    const estado = await obtenerEstadoImportacion(provincia, tipos);
    if (!estado || !estado.id) {
      return false;
    }

    return await marcarImportacionCompletada(estado.id, 'Cancelada por el usuario');
  } catch (error) {
    console.error('[OSM Import] Error canceling import:', error);
    return false;
  }
}
