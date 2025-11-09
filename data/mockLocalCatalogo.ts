
import { LocalCatalogo } from '@/types';

/**
 * Mock data para LocalCatalogo (datos importados de OSM)
 * Estos representan locales que aún no han sido enriquecidos con Google Places
 */
export const mockLocalCatalogo: LocalCatalogo[] = [
  {
    id: 'cat-1',
    osm_id: 'node/123456789',
    nombre: 'La Catrina',
    tipo_osm: 'bar',
    barlive_types: ['bar', 'terraza'],
    direccion: 'Calle Argumosa, 7',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    latitud: 40.4168,
    longitud: -3.7038,
    telefono: undefined,
    website: undefined,
    etiquetas_osm: {
      amenity: 'bar',
      cuisine: 'mexican',
      outdoor_seating: 'yes',
      'addr:street': 'Calle Argumosa',
      'addr:housenumber': '7',
      'addr:city': 'Madrid',
    },
    outdoor_seating: true,
    enriquecido: false,
    fecha_catalogado: '2025-01-15T10:00:00Z',
  },
  {
    id: 'cat-2',
    osm_id: 'node/987654321',
    nombre: 'Café de la Ópera',
    tipo_osm: 'cafe',
    barlive_types: ['cafe'],
    direccion: 'La Rambla, 74',
    provincia: 'Barcelona',
    comunidad: 'Cataluña',
    latitud: 41.3797,
    longitud: 2.1739,
    telefono: undefined,
    website: undefined,
    etiquetas_osm: {
      amenity: 'cafe',
      outdoor_seating: 'yes',
      'addr:street': 'La Rambla',
      'addr:housenumber': '74',
      'addr:city': 'Barcelona',
    },
    outdoor_seating: true,
    enriquecido: false,
    fecha_catalogado: '2025-01-15T10:30:00Z',
  },
  {
    id: 'cat-3',
    osm_id: 'node/456789123',
    nombre: 'El Rincón de Pepe',
    tipo_osm: 'restaurant',
    barlive_types: ['restaurante'],
    direccion: 'Calle Apóstoles, 34',
    provincia: 'Murcia',
    comunidad: 'Región de Murcia',
    latitud: 37.9838,
    longitud: -1.1280,
    telefono: undefined,
    website: undefined,
    etiquetas_osm: {
      amenity: 'restaurant',
      cuisine: 'regional',
      'addr:street': 'Calle Apóstoles',
      'addr:housenumber': '34',
      'addr:city': 'Murcia',
    },
    outdoor_seating: false,
    enriquecido: false,
    fecha_catalogado: '2025-01-15T11:00:00Z',
  },
  {
    id: 'cat-4',
    osm_id: 'node/789123456',
    nombre: 'Taberna El Abuelo',
    tipo_osm: 'bar',
    barlive_types: ['bar', 'tapas'],
    direccion: 'Calle Victoria, 12',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    latitud: 40.4189,
    longitud: -3.7033,
    telefono: undefined,
    website: undefined,
    etiquetas_osm: {
      amenity: 'bar',
      cuisine: 'tapas',
      'addr:street': 'Calle Victoria',
      'addr:housenumber': '12',
      'addr:city': 'Madrid',
    },
    outdoor_seating: false,
    enriquecido: false,
    fecha_catalogado: '2025-01-15T11:30:00Z',
  },
  {
    id: 'cat-5',
    osm_id: 'node/321654987',
    nombre: 'Cervecería 100 Montaditos',
    tipo_osm: 'bar',
    barlive_types: ['bar', 'cerveceria'],
    direccion: 'Calle Gran Vía, 45',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    latitud: 40.4200,
    longitud: -3.7050,
    telefono: undefined,
    website: undefined,
    etiquetas_osm: {
      amenity: 'bar',
      cuisine: 'spanish',
      'addr:street': 'Calle Gran Vía',
      'addr:housenumber': '45',
      'addr:city': 'Madrid',
    },
    outdoor_seating: false,
    enriquecido: false,
    fecha_catalogado: '2025-01-15T12:00:00Z',
  },
  {
    id: 'cat-6',
    osm_id: 'node/147258369',
    nombre: 'Bar Inexistente',
    tipo_osm: 'bar',
    barlive_types: ['bar'],
    direccion: 'Calle Falsa, 123',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    latitud: 40.4000,
    longitud: -3.7000,
    telefono: undefined,
    website: undefined,
    etiquetas_osm: {
      amenity: 'bar',
      'addr:street': 'Calle Falsa',
      'addr:housenumber': '123',
      'addr:city': 'Madrid',
    },
    outdoor_seating: false,
    enriquecido: false,
    fecha_catalogado: '2025-01-15T12:30:00Z',
    notas: 'Este es un local de prueba que no existe en Google Places',
  },
];

/**
 * Simular filtrado de candidatos para enriquecimiento
 */
export function obtenerCandidatosEnriquecimiento(
  provincia?: string,
  comunidad?: string,
  tipos?: string[],
  limite: number = 25
): LocalCatalogo[] {
  let candidatos = mockLocalCatalogo.filter(local => {
    // Solo locales no enriquecidos
    if (local.enriquecido) return false;
    
    // Excluir rechazados
    if (local.notas && local.notas.includes('Rechazado')) return false;
    
    // Filtrar por provincia
    if (provincia && local.provincia !== provincia) return false;
    
    // Filtrar por comunidad
    if (comunidad && local.comunidad !== comunidad) return false;
    
    // Filtrar por tipos
    if (tipos && tipos.length > 0) {
      const tieneAlgunTipo = local.barlive_types.some(tipo => tipos.includes(tipo));
      if (!tieneAlgunTipo) return false;
    }
    
    return true;
  });
  
  // Limitar resultados
  return candidatos.slice(0, limite);
}
