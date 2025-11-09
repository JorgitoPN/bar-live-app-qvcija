
import { ConfiguracionAPIs } from '@/types';

/**
 * 🔒 CONTROL DE COSTES API
 * Sistema de protección automática para Google Places API
 */

// Mock storage para desarrollo (en producción usar base de datos)
let mockApiConfig: ConfiguracionAPIs = {
  id: 'config-1',
  singleton_key: 'global',
  google_places_activa: true,
  google_places_contador_mes: 0,
  limite_mensual_places: 1000,
  pausar_automaticamente: true,
  alerta_80_porciento: false,
  alerta_95_porciento: false,
  ultimo_reset: new Date().toISOString(),
  mes_actual: new Date().toISOString().substring(0, 7), // YYYY-MM
};

/**
 * Obtener configuración actual de APIs
 */
export async function obtenerConfiguracionAPIs(): Promise<ConfiguracionAPIs> {
  console.log('[API Cost Control] Fetching configuration...');
  
  // En producción: await base44.entities.ConfiguracionAPIs.filter({ singleton_key: 'global' })
  // Por ahora usamos mock
  
  // Verificar si cambió el mes y resetear contador
  const mesActual = new Date().toISOString().substring(0, 7);
  if (mockApiConfig.mes_actual !== mesActual) {
    console.log('[API Cost Control] New month detected, resetting counter');
    mockApiConfig = {
      ...mockApiConfig,
      google_places_contador_mes: 0,
      mes_actual: mesActual,
      ultimo_reset: new Date().toISOString(),
      alerta_80_porciento: false,
      alerta_95_porciento: false,
    };
  }
  
  return mockApiConfig;
}

/**
 * Actualizar configuración de APIs
 */
export async function actualizarConfiguracionAPIs(
  updates: Partial<ConfiguracionAPIs>
): Promise<ConfiguracionAPIs> {
  console.log('[API Cost Control] Updating configuration:', updates);
  
  // En producción: await base44.entities.ConfiguracionAPIs.update(config.id, updates)
  mockApiConfig = {
    ...mockApiConfig,
    ...updates,
  };
  
  return mockApiConfig;
}

/**
 * Verificar si la API está disponible antes de hacer una llamada
 */
export async function verificarDisponibilidadAPI(): Promise<{
  disponible: boolean;
  razon?: string;
  porcentajeUsado?: number;
}> {
  const config = await obtenerConfiguracionAPIs();
  
  // Verificar si la API está activa
  if (!config.google_places_activa) {
    console.log('[API Cost Control] ❌ API disabled by limit');
    return {
      disponible: false,
      razon: 'API desactivada por límite mensual',
    };
  }
  
  // Verificar si se alcanzó el límite
  if (config.google_places_contador_mes >= config.limite_mensual_places) {
    console.log('[API Cost Control] ❌ Monthly limit reached');
    
    // Pausar automáticamente si está configurado
    if (config.pausar_automaticamente) {
      await actualizarConfiguracionAPIs({
        google_places_activa: false,
      });
      
      // Enviar email al admin
      await enviarAlertaAdmin(
        '⚠️ Google Places API pausada',
        `Se alcanzó el límite mensual de ${config.limite_mensual_places} llamadas.`
      );
    }
    
    return {
      disponible: false,
      razon: 'Límite mensual alcanzado',
      porcentajeUsado: 100,
    };
  }
  
  // Calcular porcentaje usado
  const porcentajeUsado = (config.google_places_contador_mes / config.limite_mensual_places) * 100;
  
  // Verificar alertas
  if (porcentajeUsado >= 95 && !config.alerta_95_porciento) {
    console.log('[API Cost Control] ⚠️ 95% usage alert');
    await actualizarConfiguracionAPIs({
      alerta_95_porciento: true,
    });
    await enviarAlertaAdmin(
      '⚠️ Google Places API al 95%',
      `Se ha usado el 95% del límite mensual (${config.google_places_contador_mes}/${config.limite_mensual_places} llamadas).`
    );
  } else if (porcentajeUsado >= 80 && !config.alerta_80_porciento) {
    console.log('[API Cost Control] ⚠️ 80% usage alert');
    await actualizarConfiguracionAPIs({
      alerta_80_porciento: true,
    });
    await enviarAlertaAdmin(
      '⚠️ Google Places API al 80%',
      `Se ha usado el 80% del límite mensual (${config.google_places_contador_mes}/${config.limite_mensual_places} llamadas).`
    );
  }
  
  console.log(`[API Cost Control] ✅ API available (${porcentajeUsado.toFixed(1)}% used)`);
  return {
    disponible: true,
    porcentajeUsado,
  };
}

/**
 * Incrementar contador de llamadas API
 */
export async function incrementarContadorAPI(cantidad: number = 1): Promise<void> {
  const config = await obtenerConfiguracionAPIs();
  
  const nuevoContador = config.google_places_contador_mes + cantidad;
  console.log(`[API Cost Control] Incrementing counter: ${config.google_places_contador_mes} → ${nuevoContador}`);
  
  await actualizarConfiguracionAPIs({
    google_places_contador_mes: nuevoContador,
  });
}

/**
 * Obtener estadísticas de uso
 */
export async function obtenerEstadisticasUso(): Promise<{
  contador: number;
  limite: number;
  porcentaje: number;
  restantes: number;
  activa: boolean;
  mesActual: string;
}> {
  const config = await obtenerConfiguracionAPIs();
  
  const porcentaje = (config.google_places_contador_mes / config.limite_mensual_places) * 100;
  const restantes = Math.max(0, config.limite_mensual_places - config.google_places_contador_mes);
  
  return {
    contador: config.google_places_contador_mes,
    limite: config.limite_mensual_places,
    porcentaje,
    restantes,
    activa: config.google_places_activa,
    mesActual: config.mes_actual,
  };
}

/**
 * Resetear contador manualmente (solo admin)
 */
export async function resetearContadorManual(): Promise<void> {
  console.log('[API Cost Control] Manual counter reset');
  
  await actualizarConfiguracionAPIs({
    google_places_contador_mes: 0,
    alerta_80_porciento: false,
    alerta_95_porciento: false,
    ultimo_reset: new Date().toISOString(),
  });
}

/**
 * Activar/desactivar API manualmente (solo admin)
 */
export async function toggleAPIManual(activa: boolean): Promise<void> {
  console.log(`[API Cost Control] Manual API toggle: ${activa}`);
  
  await actualizarConfiguracionAPIs({
    google_places_activa: activa,
  });
}

/**
 * Actualizar límite mensual (solo admin)
 */
export async function actualizarLimiteMensual(nuevoLimite: number): Promise<void> {
  console.log(`[API Cost Control] Updating monthly limit: ${nuevoLimite}`);
  
  await actualizarConfiguracionAPIs({
    limite_mensual_places: nuevoLimite,
  });
}

/**
 * Enviar alerta al administrador
 */
async function enviarAlertaAdmin(subject: string, body: string): Promise<void> {
  console.log('[API Cost Control] Sending admin alert:', subject);
  
  // En producción: usar base44.integrations.Core.SendEmail
  // Por ahora solo log
  console.log(`[Email Alert] To: admin@barlive.com`);
  console.log(`[Email Alert] Subject: ${subject}`);
  console.log(`[Email Alert] Body: ${body}`);
  
  // await base44.integrations.Core.SendEmail({
  //   to: 'admin@barlive.com',
  //   subject: subject,
  //   body: body
  // });
}

/**
 * Calcular coste estimado de una operación
 */
export function calcularCosteEstimado(operacion: {
  textSearch?: number;
  placeDetails?: number;
  photos?: number;
}): {
  llamadas: number;
  costeUSD: number;
} {
  const COSTES = {
    textSearch: 0.032,
    placeDetails: 0.017,
    photo: 0.007,
  };
  
  const llamadas = 
    (operacion.textSearch || 0) +
    (operacion.placeDetails || 0) +
    (operacion.photos || 0);
  
  const costeUSD =
    (operacion.textSearch || 0) * COSTES.textSearch +
    (operacion.placeDetails || 0) * COSTES.placeDetails +
    (operacion.photos || 0) * COSTES.photo;
  
  return { llamadas, costeUSD };
}
