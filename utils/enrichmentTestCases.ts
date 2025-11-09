
/**
 * 🧪 CASOS DE PRUEBA PARA EL SISTEMA DE ENRIQUECIMIENTO
 * 
 * Este archivo contiene casos de prueba para validar el funcionamiento
 * del sistema de validaciones, mapeo de tipos y categorización por horarios.
 */

import { GooglePlaceDetails } from '@/types';

/**
 * Casos de prueba para validación
 */
export const testCasesValidacion = [
  // ✅ CASOS VÁLIDOS
  {
    nombre: 'Bar típico español',
    esperado: { valido: true },
    place: {
      name: 'Bar Manolo',
      types: ['bar', 'food'],
      formatted_address: 'Calle Mayor 10, Madrid, España',
      business_status: 'OPERATIONAL',
      geometry: { location: { lat: 40.4168, lng: -3.7038 } },
    } as Partial<GooglePlaceDetails>,
  },
  {
    nombre: 'Discoteca nocturna',
    esperado: { valido: true },
    place: {
      name: 'Kapital',
      types: ['night_club', 'bar'],
      formatted_address: 'Calle Atocha 125, Madrid, España',
      business_status: 'OPERATIONAL',
      geometry: { location: { lat: 40.4168, lng: -3.7038 } },
    } as Partial<GooglePlaceDetails>,
  },
  {
    nombre: 'Restaurante con terraza',
    esperado: { valido: true },
    place: {
      name: 'La Terraza del Casino',
      types: ['restaurant', 'food'],
      formatted_address: 'Calle Alcalá 15, Madrid, España',
      business_status: 'OPERATIONAL',
      geometry: { location: { lat: 40.4168, lng: -3.7038 } },
    } as Partial<GooglePlaceDetails>,
  },
  
  // ❌ CASOS INVÁLIDOS
  {
    nombre: 'Peluquería (palabra prohibida)',
    esperado: { valido: false, razon: 'Nombre indica negocio no válido' },
    place: {
      name: 'Peluquería Moderna',
      types: ['beauty_salon', 'hair_care'],
      formatted_address: 'Calle Mayor 10, Madrid, España',
      business_status: 'OPERATIONAL',
      geometry: { location: { lat: 40.4168, lng: -3.7038 } },
    } as Partial<GooglePlaceDetails>,
  },
  {
    nombre: 'Hotel (tipo prohibido)',
    esperado: { valido: false, razon: 'Tipo prohibido' },
    place: {
      name: 'Hotel Ritz',
      types: ['hotel', 'lodging', 'restaurant'],
      formatted_address: 'Plaza de la Lealtad, Madrid, España',
      business_status: 'OPERATIONAL',
      geometry: { location: { lat: 40.4168, lng: -3.7038 } },
    } as Partial<GooglePlaceDetails>,
  },
  {
    nombre: 'Supermercado (tipo prohibido)',
    esperado: { valido: false, razon: 'Tipo prohibido' },
    place: {
      name: 'Mercadona',
      types: ['supermarket', 'grocery_or_supermarket', 'store'],
      formatted_address: 'Calle Serrano 50, Madrid, España',
      business_status: 'OPERATIONAL',
      geometry: { location: { lat: 40.4168, lng: -3.7038 } },
    } as Partial<GooglePlaceDetails>,
  },
  {
    nombre: 'Gimnasio (palabra prohibida)',
    esperado: { valido: false, razon: 'Nombre indica negocio no válido' },
    place: {
      name: 'Gimnasio Metropolitan',
      types: ['gym', 'health'],
      formatted_address: 'Calle Goya 10, Madrid, España',
      business_status: 'OPERATIONAL',
      geometry: { location: { lat: 40.4168, lng: -3.7038 } },
    } as Partial<GooglePlaceDetails>,
  },
  {
    nombre: 'Fuera de España',
    esperado: { valido: false, razon: 'Fuera de España' },
    place: {
      name: 'Le Bar Parisien',
      types: ['bar', 'food'],
      formatted_address: 'Rue de Rivoli, Paris, France',
      business_status: 'OPERATIONAL',
      geometry: { location: { lat: 48.8566, lng: 2.3522 } },
    } as Partial<GooglePlaceDetails>,
  },
  {
    nombre: 'Sin tipos válidos',
    esperado: { valido: false, razon: 'Sin tipos válidos de hostelería' },
    place: {
      name: 'Tienda de Ropa',
      types: ['clothing_store', 'store'],
      formatted_address: 'Calle Fuencarral 50, Madrid, España',
      business_status: 'OPERATIONAL',
      geometry: { location: { lat: 40.4168, lng: -3.7038 } },
    } as Partial<GooglePlaceDetails>,
  },
];

/**
 * Casos de prueba para mapeo de tipos
 */
export const testCasesMapeo = [
  {
    nombre: 'Bar simple',
    googleTypes: ['bar'],
    esperado: ['bar'],
  },
  {
    nombre: 'Discoteca',
    googleTypes: ['night_club'],
    esperado: ['discoteca'],
  },
  {
    nombre: 'Pub con comida',
    googleTypes: ['pub', 'food'],
    esperado: ['pub', 'bar'],
  },
  {
    nombre: 'Coctelería',
    googleTypes: ['cocktail_bar', 'bar'],
    esperado: ['cocteleria', 'bar'],
  },
  {
    nombre: 'Restaurante con bar',
    googleTypes: ['restaurant', 'bar'],
    esperado: ['restaurante', 'bar'],
  },
  {
    nombre: 'Cervecería con terraza',
    googleTypes: ['brewery', 'beer_garden'],
    esperado: ['pub', 'cerveceria', 'terraza'],
  },
  {
    nombre: 'Rooftop bar',
    googleTypes: ['rooftop_bar', 'bar'],
    esperado: ['rooftop', 'bar'],
  },
];

/**
 * Casos de prueba para categorización por horarios
 */
export const testCasesHorarios = [
  {
    nombre: 'Café (abre temprano, cierra temprano)',
    horarios: [
      'lunes: 07:00–22:00',
      'martes: 07:00–22:00',
      'miércoles: 07:00–22:00',
      'jueves: 07:00–22:00',
      'viernes: 07:00–00:00',
      'sábado: 08:00–00:00',
      'domingo: 08:00–22:00',
    ],
    tiposBase: ['cafe'],
    esperado: ['cafe', 'bar'],
    categoria: 'CAFÉ',
  },
  {
    nombre: 'Restaurante (abre medio día)',
    horarios: [
      'lunes: 13:00–16:00, 20:00–23:00',
      'martes: 13:00–16:00, 20:00–23:00',
      'miércoles: 13:00–16:00, 20:00–23:00',
      'jueves: 13:00–16:00, 20:00–23:00',
      'viernes: 13:00–16:00, 20:00–01:00',
      'sábado: 13:00–16:00, 20:00–01:00',
      'domingo: 13:00–16:00',
    ],
    tiposBase: ['restaurante'],
    esperado: ['restaurante', 'bar'],
    categoria: 'RESTAURANTE',
  },
  {
    nombre: 'Pub/Coctelería (abre tarde, cierra madrugada)',
    horarios: [
      'lunes: Cerrado',
      'martes: Cerrado',
      'miércoles: 18:00–03:00',
      'jueves: 18:00–03:00',
      'viernes: 18:00–04:00',
      'sábado: 18:00–04:00',
      'domingo: Cerrado',
    ],
    tiposBase: ['bar', 'cocteleria'],
    esperado: ['bar', 'cocteleria', 'pub', 'lounge'],
    categoria: 'PUB/COCTELERÍA',
  },
  {
    nombre: 'Discoteca (abre medianoche, cierra amanecer)',
    horarios: [
      'lunes: Cerrado',
      'martes: Cerrado',
      'miércoles: Cerrado',
      'jueves: 00:00–06:00',
      'viernes: 00:00–06:00',
      'sábado: 00:00–06:00',
      'domingo: Cerrado',
    ],
    tiposBase: ['discoteca'],
    esperado: ['discoteca', 'lounge'],
    categoria: 'DISCOTECA',
  },
  {
    nombre: 'Bar 24 horas',
    horarios: [
      'lunes: Abierto 24 horas',
      'martes: Abierto 24 horas',
      'miércoles: Abierto 24 horas',
      'jueves: Abierto 24 horas',
      'viernes: Abierto 24 horas',
      'sábado: Abierto 24 horas',
      'domingo: Abierto 24 horas',
    ],
    tiposBase: ['bar'],
    esperado: ['bar'],
    categoria: 'BAR (sin cambios)',
  },
];

/**
 * Ejemplos reales de locales
 */
export const ejemplosReales = [
  {
    nombre: 'Kapital Madrid',
    descripcion: 'Famosa discoteca de 7 plantas en Madrid',
    googleData: {
      name: 'Teatro Kapital',
      types: ['night_club', 'bar', 'point_of_interest'],
      formatted_address: 'Calle de Atocha, 125, 28012 Madrid, España',
      rating: 3.8,
      user_ratings_total: 4521,
      opening_hours: {
        weekday_text: [
          'lunes: Cerrado',
          'martes: Cerrado',
          'miércoles: Cerrado',
          'jueves: 00:00–06:00',
          'viernes: 00:00–06:00',
          'sábado: 00:00–06:00',
          'domingo: Cerrado',
        ],
      },
    },
    resultadoEsperado: {
      valido: true,
      barliveTypes: ['discoteca', 'lounge'],
      categoria: 'DISCOTECA',
    },
  },
  {
    nombre: 'Café Comercial',
    descripcion: 'Histórico café madrileño',
    googleData: {
      name: 'Café Comercial',
      types: ['cafe', 'bar', 'restaurant'],
      formatted_address: 'Glorieta de Bilbao, 7, 28004 Madrid, España',
      rating: 4.2,
      user_ratings_total: 2341,
      opening_hours: {
        weekday_text: [
          'lunes: 08:00–01:00',
          'martes: 08:00–01:00',
          'miércoles: 08:00–01:00',
          'jueves: 08:00–02:00',
          'viernes: 08:00–02:30',
          'sábado: 09:00–02:30',
          'domingo: 09:00–01:00',
        ],
      },
    },
    resultadoEsperado: {
      valido: true,
      barliveTypes: ['cafe', 'bar'],
      categoria: 'CAFÉ',
    },
  },
  {
    nombre: 'Salmon Guru',
    descripcion: 'Coctelería de referencia en Madrid',
    googleData: {
      name: 'Salmon Guru',
      types: ['cocktail_bar', 'bar'],
      formatted_address: 'Calle de Echegaray, 21, 28014 Madrid, España',
      rating: 4.6,
      user_ratings_total: 1823,
      opening_hours: {
        weekday_text: [
          'lunes: Cerrado',
          'martes: 18:00–02:30',
          'miércoles: 18:00–02:30',
          'jueves: 18:00–02:30',
          'viernes: 18:00–03:00',
          'sábado: 18:00–03:00',
          'domingo: 18:00–02:30',
        ],
      },
    },
    resultadoEsperado: {
      valido: true,
      barliveTypes: ['cocteleria', 'bar', 'pub', 'lounge'],
      categoria: 'PUB/COCTELERÍA',
    },
  },
  {
    nombre: 'Casa Botín',
    descripcion: 'Restaurante más antiguo del mundo según Guinness',
    googleData: {
      name: 'Restaurante Sobrino de Botín',
      types: ['restaurant', 'food', 'point_of_interest'],
      formatted_address: 'Calle de Cuchilleros, 17, 28005 Madrid, España',
      rating: 4.4,
      user_ratings_total: 15234,
      opening_hours: {
        weekday_text: [
          'lunes: 13:00–16:00, 20:00–00:00',
          'martes: 13:00–16:00, 20:00–00:00',
          'miércoles: 13:00–16:00, 20:00–00:00',
          'jueves: 13:00–16:00, 20:00–00:00',
          'viernes: 13:00–16:00, 20:00–00:00',
          'sábado: 13:00–16:00, 20:00–00:00',
          'domingo: 13:00–16:00, 20:00–00:00',
        ],
      },
    },
    resultadoEsperado: {
      valido: true,
      barliveTypes: ['restaurante', 'bar'],
      categoria: 'RESTAURANTE',
    },
  },
];

/**
 * Función helper para ejecutar tests de validación
 */
export function ejecutarTestsValidacion() {
  console.log('\n🧪 EJECUTANDO TESTS DE VALIDACIÓN\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCasesValidacion) {
    console.log(`\nTest: ${testCase.nombre}`);
    console.log(`Esperado: ${JSON.stringify(testCase.esperado)}`);
    
    // Aquí se ejecutaría la validación real
    // const resultado = esLocalValido(testCase.place as GooglePlaceDetails);
    
    // Por ahora solo mostramos el caso de prueba
    console.log(`Place: ${testCase.place.name}`);
    console.log(`Types: ${testCase.place.types?.join(', ')}`);
    console.log(`Address: ${testCase.place.formatted_address}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
}

/**
 * Función helper para mostrar ejemplos reales
 */
export function mostrarEjemplosReales() {
  console.log('\n🎯 EJEMPLOS REALES DE LOCALES\n');
  console.log('='.repeat(60));
  
  for (const ejemplo of ejemplosReales) {
    console.log(`\n📍 ${ejemplo.nombre}`);
    console.log(`   ${ejemplo.descripcion}`);
    console.log(`   Rating: ${ejemplo.googleData.rating} ⭐ (${ejemplo.googleData.user_ratings_total} reviews)`);
    console.log(`   Types: ${ejemplo.googleData.types.join(', ')}`);
    console.log(`   Horarios: ${ejemplo.googleData.opening_hours.weekday_text[4]}`); // Viernes
    console.log(`   Resultado esperado:`);
    console.log(`   - Válido: ${ejemplo.resultadoEsperado.valido ? '✅' : '❌'}`);
    console.log(`   - Tipos BarLive: ${ejemplo.resultadoEsperado.barliveTypes.join(', ')}`);
    console.log(`   - Categoría: ${ejemplo.resultadoEsperado.categoria}`);
  }
  
  console.log('\n' + '='.repeat(60));
}
