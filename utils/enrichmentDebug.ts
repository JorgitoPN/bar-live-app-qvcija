
import { LocalCatalogo, GooglePlaceDetails } from '@/types';
import { buscarYEnriquecerLocal } from './enrichmentService';

/**
 * Herramientas de depuración para el sistema de enriquecimiento
 */

/**
 * Probar enriquecimiento de un local con logs detallados
 */
export async function debugEnriquecimiento(localCatalogo: LocalCatalogo) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              DEBUG ENRICHMENT SESSION                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 INPUT DATA:');
  console.log('  ID:', localCatalogo.id);
  console.log('  Nombre:', localCatalogo.nombre);
  console.log('  Tipo OSM:', localCatalogo.tipo_osm);
  console.log('  BarLive Types:', localCatalogo.barlive_types.join(', '));
  console.log('  Dirección:', localCatalogo.direccion);
  console.log('  Provincia:', localCatalogo.provincia);
  console.log('  Comunidad:', localCatalogo.comunidad);
  console.log('  Coordenadas:', `${localCatalogo.latitud}, ${localCatalogo.longitud}`);
  console.log('  Enriquecido:', localCatalogo.enriquecido ? 'Sí' : 'No');
  
  if (localCatalogo.notas) {
    console.log('  Notas:', localCatalogo.notas);
  }
  
  console.log('\n🔍 STARTING ENRICHMENT PROCESS...\n');
  
  const startTime = Date.now();
  const resultado = await buscarYEnriquecerLocal(localCatalogo);
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n📊 RESULT:');
  console.log('  Success:', resultado.success ? '✅ YES' : '❌ NO');
  console.log('  Duration:', `${duration}ms`);
  
  if (resultado.success) {
    console.log('  Google Place ID:', resultado.google_place_id);
    console.log('  Strategy Used:', resultado.strategy_used);
    
    if (resultado.datosEnriquecidos) {
      const datos = resultado.datosEnriquecidos;
      
      console.log('\n📍 ENRICHED DATA:');
      console.log('  Nombre:', datos.nombre);
      console.log('  Dirección:', datos.direccion);
      console.log('  Teléfono:', datos.telefono || 'N/A');
      console.log('  Website:', datos.website || 'N/A');
      console.log('  Rating:', datos.rating ? `⭐ ${datos.rating.toFixed(1)}` : 'N/A');
      console.log('  Reviews:', datos.user_ratings_total || 0);
      console.log('  Price Level:', datos.price_level ? '💰'.repeat(datos.price_level) : 'N/A');
      console.log('  Business Status:', datos.business_status || 'N/A');
      
      console.log('\n🏷️ TYPES:');
      console.log('  BarLive Types:', datos.barlive_types.join(', '));
      console.log('  Google Types:', datos.google_types.slice(0, 5).join(', '));
      
      console.log('\n🕐 SCHEDULES:');
      Object.entries(datos.horarios).forEach(([dia, horarios]) => {
        console.log(`  ${dia.charAt(0).toUpperCase() + dia.slice(1)}:`, horarios.join(', '));
      });
      console.log('  Abierto ahora:', datos.abierto_ahora ? '🟢 Sí' : '🔴 No');
      
      console.log('\n🎯 SERVICES:');
      const serviciosActivos = Object.entries(datos.servicios)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);
      console.log('  ', serviciosActivos.join(', ') || 'Ninguno');
      
      console.log('\n🎨 AMBIANCE:');
      const ambienteActivo = Object.entries(datos.ambiente)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);
      console.log('  ', ambienteActivo.join(', ') || 'Ninguno');
      
      console.log('\n👥 CLIENTELE:');
      const clientelaActiva = Object.entries(datos.clientela)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);
      console.log('  ', clientelaActiva.join(', ') || 'Ninguno');
      
      console.log('\n💳 PAYMENT METHODS:');
      const metodosActivos = Object.entries(datos.metodos_pago)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);
      console.log('  ', metodosActivos.join(', ') || 'Ninguno');
      
      console.log('\n📸 PHOTOS:');
      console.log('  Count:', datos.fotos.length);
      datos.fotos.forEach((foto, i) => {
        console.log(`  Photo ${i + 1}:`, foto.substring(0, 60) + '...');
      });
      
      if (datos.editorial_summary) {
        console.log('\n📝 SUMMARY:');
        console.log('  ', datos.editorial_summary);
      }
    }
  } else {
    console.log('  Error:', resultado.error || 'Unknown error');
    console.log('  Notas:', resultado.notas || 'N/A');
  }
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              DEBUG SESSION COMPLETED                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  return resultado;
}

/**
 * Comparar datos OSM vs Google Places
 */
export function compararDatos(
  localCatalogo: LocalCatalogo,
  placeDetails: GooglePlaceDetails
) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  DATA COMPARISON                       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 COMPARISON:');
  
  console.log('\n  Nombre:');
  console.log('    OSM:', localCatalogo.nombre);
  console.log('    Google:', placeDetails.name);
  console.log('    Match:', localCatalogo.nombre.toLowerCase() === placeDetails.name.toLowerCase() ? '✅' : '❌');
  
  console.log('\n  Dirección:');
  console.log('    OSM:', localCatalogo.direccion);
  console.log('    Google:', placeDetails.formatted_address);
  
  console.log('\n  Coordenadas:');
  console.log('    OSM:', `${localCatalogo.latitud}, ${localCatalogo.longitud}`);
  console.log('    Google:', `${placeDetails.geometry.location.lat}, ${placeDetails.geometry.location.lng}`);
  
  const distancia = calcularDistancia(
    localCatalogo.latitud,
    localCatalogo.longitud,
    placeDetails.geometry.location.lat,
    placeDetails.geometry.location.lng
  );
  console.log('    Distancia:', `${distancia.toFixed(2)}m`);
  console.log('    Match:', distancia <= 100 ? '✅' : '⚠️');
  
  console.log('\n  Teléfono:');
  console.log('    OSM:', localCatalogo.telefono || 'N/A');
  console.log('    Google:', placeDetails.formatted_phone_number || 'N/A');
  
  console.log('\n  Website:');
  console.log('    OSM:', localCatalogo.website || 'N/A');
  console.log('    Google:', placeDetails.website || 'N/A');
  
  console.log('\n╚════════════════════════════════════════════════════════╝\n');
}

/**
 * Calcular distancia entre dos puntos (Haversine)
 */
function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Generar reporte de estadísticas de enriquecimiento
 */
export function generarReporteEstadisticas(
  resultados: { success: boolean; datosEnriquecidos?: any }[]
) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              ENRICHMENT STATISTICS                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const total = resultados.length;
  const exitosos = resultados.filter(r => r.success).length;
  const fallidos = total - exitosos;
  const tasaExito = (exitosos / total) * 100;
  
  console.log('📊 GENERAL:');
  console.log('  Total procesados:', total);
  console.log('  Exitosos:', exitosos, `(${tasaExito.toFixed(1)}%)`);
  console.log('  Fallidos:', fallidos, `(${(100 - tasaExito).toFixed(1)}%)`);
  
  const conFotos = resultados.filter(r => 
    r.datosEnriquecidos && r.datosEnriquecidos.fotos.length > 0
  ).length;
  const conRating = resultados.filter(r => 
    r.datosEnriquecidos && r.datosEnriquecidos.rating
  ).length;
  const conHorarios = resultados.filter(r => 
    r.datosEnriquecidos && Object.keys(r.datosEnriquecidos.horarios).length > 0
  ).length;
  
  console.log('\n📸 COMPLETITUD:');
  console.log('  Con fotos:', conFotos, `(${((conFotos / exitosos) * 100).toFixed(1)}%)`);
  console.log('  Con rating:', conRating, `(${((conRating / exitosos) * 100).toFixed(1)}%)`);
  console.log('  Con horarios:', conHorarios, `(${((conHorarios / exitosos) * 100).toFixed(1)}%)`);
  
  const ratings = resultados
    .filter(r => r.datosEnriquecidos?.rating)
    .map(r => r.datosEnriquecidos!.rating!);
  
  if (ratings.length > 0) {
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const maxRating = Math.max(...ratings);
    const minRating = Math.min(...ratings);
    
    console.log('\n⭐ RATINGS:');
    console.log('  Promedio:', avgRating.toFixed(2));
    console.log('  Máximo:', maxRating.toFixed(1));
    console.log('  Mínimo:', minRating.toFixed(1));
  }
  
  const totalFotos = resultados
    .filter(r => r.datosEnriquecidos)
    .reduce((sum, r) => sum + (r.datosEnriquecidos?.fotos.length || 0), 0);
  
  console.log('\n📷 FOTOS:');
  console.log('  Total descargadas:', totalFotos);
  console.log('  Promedio por local:', (totalFotos / exitosos).toFixed(1));
  
  console.log('\n╚════════════════════════════════════════════════════════╝\n');
}
