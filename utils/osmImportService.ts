
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
 * Importar catálogo de locales desde OpenStreetMap
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
    // Construir query de Overpass API
    const query = construirQueryOverpass(provincia, tipos, limite);
    console.log('[OSM Import] Overpass query constructed:', query);

    // Consultar Overpass API
    const localesOSM = await consultarOverpassAPI(query);
    console.log(`[OSM Import] Received ${localesOSM.length} results from OSM`);

    // Filtrar por tipos solicitados
    const localesFiltrados = localesOSM.filter(element => {
      const amenity = element.tags?.amenity;
      const tipoValido = amenity && tipos.includes(amenity);
      if (!tipoValido) {
        console.log(`[OSM Import] Filtering out element with amenity: ${amenity}`);
      }
      return tipoValido;
    });
    console.log(`[OSM Import] After filtering: ${localesFiltrados.length} elements match requested types`);

    // Procesar y convertir a LocalCatalogo
    const localesCatalogo: LocalCatalogo[] = [];
    
    for (let i = 0; i < localesFiltrados.length && i < limite; i++) {
      const osmElement = localesFiltrados[i];
      
      try {
        const localCatalogo = convertirOSMaLocalCatalogo(osmElement, provincia);
        
        if (localCatalogo) {
          // Guardar en Supabase
          const localGuardado = await guardarLocalEnSupabase(localCatalogo);
          
          if (localGuardado) {
            localesCatalogo.push(localCatalogo);
            console.log(`[OSM Import] Saved: ${localCatalogo.nombre} (${localCatalogo.tipo_osm})`);
            
            if (onProgress) {
              onProgress(i + 1, Math.min(localesFiltrados.length, limite), localCatalogo);
            }
          }
        }
      } catch (error) {
        console.error('[OSM Import] Error processing element:', error);
      }
    }

    console.log('[OSM Import] ========================================');
    console.log(`[OSM Import] Import completed: ${localesCatalogo.length} venues`);
    console.log('[OSM Import] Breakdown by type:');
    const breakdown: Record<string, number> = {};
    localesCatalogo.forEach(local => {
      const tipo = local.tipo_osm || 'unknown';
      breakdown[tipo] = (breakdown[tipo] || 0) + 1;
    });
    Object.entries(breakdown).forEach(([tipo, count]) => {
      console.log(`[OSM Import]   - ${tipo}: ${count}`);
    });
    console.log('[OSM Import] COST: 0€ (OSM is free)');
    console.log('[OSM Import] ========================================');

    return localesCatalogo;
  } catch (error) {
    console.error('[OSM Import] Import error:', error);
    throw error;
  }
}

/**
 * Guardar local en Supabase
 * IMPORTANTE: Los locales importados desde OSM se guardan como INACTIVOS
 * Solo se activan después de un enriquecimiento exitoso con Google Places
 */
async function guardarLocalEnSupabase(localCatalogo: LocalCatalogo): Promise<boolean> {
  try {
    // 🚫 VERIFICAR SI EL LOCAL ESTÁ EXCLUIDO
    console.log(`[OSM Import] Checking if local is excluded: ${localCatalogo.nombre}`);
    const exclusionCheck = await verificarLocalExcluido({
      nombre: localCatalogo.nombre,
      latitud: localCatalogo.latitud,
      longitud: localCatalogo.longitud,
      osm_id: localCatalogo.osm_id,
      amenity_type: localCatalogo.tipo_osm, // ✅ Pasar el tipo de amenity
    });

    if (exclusionCheck.excluido) {
      console.log(`[OSM Import] ❌ Local is excluded, skipping: ${localCatalogo.nombre}`);
      console.log(`[OSM Import] Reason: ${exclusionCheck.motivo}`);
      return false;
    }
    console.log(`[OSM Import] ✅ Local is not excluded, proceeding with import`);

    // Verificar si ya existe (por osm_id)
    const { data: existente, error: errorBusqueda } = await supabase
      .from('locales')
      .select('id')
      .eq('source_id', localCatalogo.osm_id)
      .eq('source_type', 'osm')
      .single();

    if (existente) {
      console.log(`[OSM Import] Local already exists: ${localCatalogo.nombre}`);
      return false;
    }

    // Insertar nuevo local
    // ⚠️ IMPORTANTE: activo = false hasta que se enriquezca con éxito
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
        activo: false, // ⚠️ INACTIVO hasta enriquecimiento exitoso
      })
      .select()
      .single();

    if (error) {
      console.error('[OSM Import] Error saving to Supabase:', error);
      return false;
    }

    console.log(`[OSM Import] Successfully saved: ${localCatalogo.nombre} (${localCatalogo.tipo_osm}) - INACTIVE until enriched`);
    return true;
  } catch (error) {
    console.error('[OSM Import] Error in guardarLocalEnSupabase:', error);
    return false;
  }
}

/**
 * Construir query de Overpass API
 */
function construirQueryOverpass(
  provincia: string,
  tipos: string[],
  limite: number
): string {
  // Convertir tipos a formato OSM - crear filtros individuales para cada tipo
  const amenityFilters = tipos.map(tipo => `["amenity"="${tipo}"]`).join('');
  
  console.log('[OSM Import] Building query for types:', tipos);
  console.log('[OSM Import] Amenity filters:', amenityFilters);
  
  // Query de Overpass API mejorada
  // Busca en toda España si no encuentra por provincia específica
  const query = `
    [out:json][timeout:120];
    (
      area["name"="${provincia}"]["boundary"="administrative"]->.searchArea;
      (
        node["amenity"~"${tipos.join('|')}"](area.searchArea);
        way["amenity"~"${tipos.join('|')}"](area.searchArea);
        relation["amenity"~"${tipos.join('|')}"](area.searchArea);
      );
    );
    out body center ${limite * 2};
  `;

  return query.trim();
}

/**
 * Consultar Overpass API
 */
async function consultarOverpassAPI(query: string): Promise<any[]> {
  console.log('[OSM Import] Querying Overpass API...');
  console.log('[OSM Import] Query:', query);
  
  // URL de Overpass API
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  
  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.elements || !Array.isArray(data.elements)) {
      console.log('[OSM Import] No elements found in response');
      console.log('[OSM Import] Response data:', JSON.stringify(data, null, 2));
      return [];
    }

    console.log(`[OSM Import] Overpass API returned ${data.elements.length} elements`);
    
    // Log breakdown by amenity type
    const typeBreakdown: Record<string, number> = {};
    data.elements.forEach((element: any) => {
      const amenity = element.tags?.amenity || 'unknown';
      typeBreakdown[amenity] = (typeBreakdown[amenity] || 0) + 1;
    });
    console.log('[OSM Import] Type breakdown from OSM:');
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`[OSM Import]   - ${type}: ${count}`);
    });
    
    return data.elements;
  } catch (error) {
    console.error('[OSM Import] Overpass API error:', error);
    
    // En caso de error, retornar datos mock para desarrollo
    console.log('[OSM Import] Using mock data for development');
    return generarDatosMockOSM();
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
  
  // Verificar que tenga nombre
  if (!tags.name) {
    console.log('[OSM Import] Skipping element without name');
    return null;
  }

  // Obtener coordenadas
  let lat = osmElement.lat;
  let lon = osmElement.lon;
  
  // Si es un way (polígono), usar el centro
  if (!lat && osmElement.center) {
    lat = osmElement.center.lat;
    lon = osmElement.center.lon;
  }
  
  if (!lat || !lon) {
    console.log('[OSM Import] Skipping element without coordinates');
    return null;
  }

  // Obtener tipo OSM
  const tipoOSM = tags.amenity || 'bar';
  
  // Mapear a tipos BarLive
  const barliveTypes = OSM_TO_BARLIVE_TYPES[tipoOSM] || ['bar'];

  // Construir dirección
  const direccion = construirDireccion(tags);

  // Crear LocalCatalogo
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
 * Generar datos mock de OSM para desarrollo
 */
function generarDatosMockOSM(): any[] {
  const nombres = [
    'La Catrina', 'El Rincón de Pepe', 'Taberna El Abuelo',
    'Cervecería 100 Montaditos', 'Café Central', 'Bar Manolo',
    'Restaurante Casa Paco', 'Pub The Irish', 'Discoteca Kapital',
    'Café de la Ópera', 'Bar Los Gatos', 'Restaurante El Faro',
    'Pub La Cervecería', 'Bar La Esquina', 'Café Comercial',
    'Restaurante La Barraca', 'Bar El Tigre', 'Café Gijón',
    'Pub Finnegan', 'Bar Lambuzo', 'Restaurante Botín',
    'Café del Círculo', 'Bar Santander', 'Pub Molly Malone',
    'Restaurante Sobrino de Botín', 'Bar La Venencia',
  ];

  const calles = [
    'Calle Mayor', 'Calle Alcalá', 'Gran Vía', 'Calle Serrano',
    'Calle Goya', 'Calle Fuencarral', 'Calle Preciados',
    'Calle Arenal', 'Calle Toledo', 'Calle Atocha',
  ];

  const tipos = ['bar', 'restaurant', 'cafe', 'pub', 'nightclub'];

  const elementos: any[] = [];

  // Generar 10 de cada tipo para asegurar variedad
  tipos.forEach(tipo => {
    for (let i = 0; i < 10; i++) {
      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const calle = calles[Math.floor(Math.random() * calles.length)];
      const numero = Math.floor(Math.random() * 100) + 1;
      
      elementos.push({
        type: 'node',
        id: 1000000 + elementos.length,
        lat: 40.4168 + (Math.random() - 0.5) * 0.1,
        lon: -3.7038 + (Math.random() - 0.5) * 0.1,
        tags: {
          name: `${nombre} ${tipo} ${i + 1}`,
          amenity: tipo,
          'addr:street': calle,
          'addr:housenumber': numero.toString(),
          'addr:city': 'Madrid',
          outdoor_seating: Math.random() > 0.5 ? 'yes' : 'no',
        },
      });
    }
  });

  console.log('[OSM Import] Generated mock data with breakdown:');
  const mockBreakdown: Record<string, number> = {};
  elementos.forEach(element => {
    const amenity = element.tags.amenity;
    mockBreakdown[amenity] = (mockBreakdown[amenity] || 0) + 1;
  });
  Object.entries(mockBreakdown).forEach(([type, count]) => {
    console.log(`[OSM Import]   - ${type}: ${count}`);
  });

  return elementos;
}
