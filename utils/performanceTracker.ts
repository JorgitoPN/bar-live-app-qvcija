
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 PERFORMANCE TRACKER - FASE 0, 1 & 8 INSTRUMENTACIÓN Y OBSERVABILIDAD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PROPÓSITO:
 * - Medir TTFB (Time To First Byte) de todas las peticiones de red
 * - Medir TTI (Time To Interactive) cuando la UI es interactiva
 * - Identificar cuellos de botella en el bootstrap de la app
 * - FASE 8: Enviar métricas de rendimiento a Supabase para análisis
 * 
 * USO:
 * 1. Importar: import PerformanceTracker from '@/utils/performanceTracker';
 * 2. Iniciar medición: PerformanceTracker.start('nombre_operacion');
 * 3. Finalizar medición: PerformanceTracker.end('nombre_operacion');
 * 4. Ver resultados: PerformanceTracker.getMeasures();
 * 5. Limpiar: PerformanceTracker.clearMeasures();
 * 6. FASE 8: Enviar métricas: PerformanceTracker.logPerformanceMetrics();
 */

import { supabase } from './supabase';
import { Platform } from 'react-native';

interface PerformanceMeasure {
  start: number;
  end: number;
  duration: number;
}

// ✅ FASE 8: Interfaz para métricas de rendimiento
interface PerformanceMetrics {
  tti: number; // Time To Interactive
  ttfb: number; // Time To First Byte
  platform: string;
  device: string;
  networkType?: string;
  timestamp: string;
  measures: Record<string, PerformanceMeasure>;
}

class PerformanceTrackerClass {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, PerformanceMeasure> = new Map();
  private appLaunchTime: number = 0;
  private ttiRecorded: boolean = false;
  private tti: number = 0;

  constructor() {
    // Marcar el inicio de la app
    this.appLaunchTime = performance.now();
    console.log('[PerformanceTracker] 🚀 App launch started at', this.appLaunchTime.toFixed(2), 'ms');
  }

  /**
   * Iniciar una medición
   * @param markName Nombre único de la medición
   */
  start(markName: string): void {
    const timestamp = performance.now();
    this.marks.set(markName, timestamp);
    
    console.log(`[PERF_START] ${markName} at ${timestamp.toFixed(2)}ms (${(timestamp - this.appLaunchTime).toFixed(2)}ms desde launch)`);
  }

  /**
   * Finalizar una medición
   * @param markName Nombre de la medición (debe coincidir con start)
   * @param measureName Nombre opcional para la medida final
   * @returns Duración en milisegundos
   */
  end(markName: string, measureName?: string): number {
    const endTime = performance.now();
    const startTime = this.marks.get(markName);
    
    if (!startTime) {
      console.warn(`[PerformanceTracker] ⚠️ No se encontró marca de inicio para: ${markName}`);
      return 0;
    }
    
    const duration = endTime - startTime;
    const name = measureName || markName;
    
    const measure: PerformanceMeasure = {
      start: startTime,
      end: endTime,
      duration,
    };
    
    this.measures.set(name, measure);
    
    // Clasificar performance
    let performanceLabel = '✅ EXCELENTE';
    if (duration > 1000) {
      performanceLabel = '🐌 MUY LENTO';
    } else if (duration > 500) {
      performanceLabel = '⚠️ LENTO';
    } else if (duration > 200) {
      performanceLabel = '🟡 ACEPTABLE';
    } else if (duration > 100) {
      performanceLabel = '⚡ RÁPIDO';
    }
    
    console.log(
      `[PERF_END] ${name} - Duration: ${duration.toFixed(2)}ms (${(endTime - this.appLaunchTime).toFixed(2)}ms desde launch) ${performanceLabel}`
    );
    
    // Limpiar marca
    this.marks.delete(markName);
    
    return duration;
  }

  /**
   * Obtener todas las mediciones realizadas
   * @returns Objeto con todas las mediciones
   */
  getMeasures(): Record<string, PerformanceMeasure> {
    const measuresObject: Record<string, PerformanceMeasure> = {};
    
    this.measures.forEach((measure, name) => {
      measuresObject[name] = measure;
    });
    
    return measuresObject;
  }

  /**
   * Obtener un resumen formateado de las mediciones
   * @returns String con el resumen
   */
  getSummary(): string {
    const measures = this.getMeasures();
    const entries = Object.entries(measures);
    
    if (entries.length === 0) {
      return 'No hay mediciones disponibles';
    }
    
    let summary = '\n═══════════════════════════════════════════════════════\n';
    summary += '📊 RESUMEN DE PERFORMANCE\n';
    summary += '═══════════════════════════════════════════════════════\n\n';
    
    // Ordenar por tiempo de inicio
    entries.sort((a, b) => a[1].start - b[1].start);
    
    entries.forEach(([name, measure]) => {
      const durationStr = measure.duration.toFixed(2).padStart(8);
      const startStr = measure.start.toFixed(2).padStart(10);
      const endStr = measure.end.toFixed(2).padStart(10);
      
      summary += `${name}\n`;
      summary += `  ⏱️  Duración: ${durationStr}ms\n`;
      summary += `  🚀 Inicio:    ${startStr}ms\n`;
      summary += `  🏁 Fin:       ${endStr}ms\n\n`;
    });
    
    // Calcular tiempo total
    const totalTime = Math.max(...entries.map(([_, m]) => m.end));
    summary += `═══════════════════════════════════════════════════════\n`;
    summary += `⏱️  TIEMPO TOTAL: ${totalTime.toFixed(2)}ms\n`;
    summary += `═══════════════════════════════════════════════════════\n`;
    
    return summary;
  }

  /**
   * Limpiar todas las mediciones
   */
  clearMeasures(): void {
    this.marks.clear();
    this.measures.clear();
    console.log('[PerformanceTracker] 🧹 Mediciones limpiadas');
  }

  /**
   * Obtener el tiempo desde el launch de la app
   * @returns Tiempo en milisegundos
   */
  getTimeSinceLaunch(): number {
    return performance.now() - this.appLaunchTime;
  }
  
  /**
   * ✅ FASE 8: Registrar TTI (Time To Interactive)
   * Debe llamarse cuando la UI es completamente interactiva
   */
  recordTTI(): void {
    if (this.ttiRecorded) {
      console.warn('[PerformanceTracker FASE 8] ⚠️ TTI ya fue registrado');
      return;
    }
    
    this.tti = this.getTimeSinceLaunch();
    this.ttiRecorded = true;
    
    console.log('[PerformanceTracker FASE 8] 🎯 TTI registrado:', this.tti.toFixed(2), 'ms');
    
    // ✅ Clasificar TTI
    let ttiLabel = '✅ EXCELENTE';
    if (this.tti > 3000) {
      ttiLabel = '🐌 MUY LENTO';
    } else if (this.tti > 1000) {
      ttiLabel = '⚠️ LENTO';
    } else if (this.tti > 500) {
      ttiLabel = '🟡 ACEPTABLE';
    } else if (this.tti > 200) {
      ttiLabel = '⚡ RÁPIDO';
    }
    
    console.log('[PerformanceTracker FASE 8] 📊 TTI Clasificación:', ttiLabel);
  }
  
  /**
   * ✅ FASE 8: Enviar métricas de rendimiento a Supabase
   * Envía de forma silenciosa el TTI real de los usuarios para análisis
   */
  async logPerformanceMetrics(): Promise<void> {
    if (!this.ttiRecorded) {
      console.warn('[PerformanceTracker FASE 8] ⚠️ TTI no registrado - llamar recordTTI() primero');
      return;
    }
    
    try {
      // ✅ Obtener TTFB de la primera petición de red
      const measures = this.getMeasures();
      const firstNetworkRequest = Object.entries(measures).find(([name]) => 
        name.includes('fetch') || name.includes('rpc') || name.includes('query')
      );
      
      const ttfb = firstNetworkRequest ? firstNetworkRequest[1].duration : 0;
      
      // ✅ Construir métricas
      const metrics: PerformanceMetrics = {
        tti: this.tti,
        ttfb,
        platform: Platform.OS,
        device: Platform.select({
          ios: 'iOS',
          android: 'Android',
          web: 'Web',
          default: 'Unknown',
        }),
        timestamp: new Date().toISOString(),
        measures,
      };
      
      console.log('[PerformanceTracker FASE 8] 📤 Enviando métricas a Supabase:', {
        tti: metrics.tti.toFixed(2),
        ttfb: metrics.ttfb.toFixed(2),
        platform: metrics.platform,
      });
      
      // ✅ Enviar a Supabase (silenciosamente)
      // TODO: Backend Integration - POST /api/performance-metrics
      // Body: { tti, ttfb, platform, device, timestamp, measures }
      // Returns: { success: true }
      
      // ✅ Por ahora, solo log en consola (modo release)
      if (__DEV__) {
        console.log('[PerformanceTracker FASE 8] 📊 Métricas (DEV MODE):', JSON.stringify(metrics, null, 2));
      } else {
        // En producción, enviar a Supabase
        const { error } = await supabase
          .from('performance_logs')
          .insert({
            tti: metrics.tti,
            ttfb: metrics.ttfb,
            platform: metrics.platform,
            device: metrics.device,
            timestamp: metrics.timestamp,
            measures: metrics.measures,
          });
        
        if (error) {
          console.error('[PerformanceTracker FASE 8] ❌ Error enviando métricas:', error);
        } else {
          console.log('[PerformanceTracker FASE 8] ✅ Métricas enviadas exitosamente');
        }
      }
    } catch (error) {
      // ✅ Silenciar errores - no queremos afectar la experiencia del usuario
      console.error('[PerformanceTracker FASE 8] ❌ Error en logPerformanceMetrics:', error);
    }
  }
  
  /**
   * ✅ FASE 8: Obtener TTI registrado
   * @returns TTI en milisegundos
   */
  getTTI(): number {
    return this.tti;
  }
}

// Exportar instancia singleton
export const PerformanceTracker = new PerformanceTrackerClass();
export default PerformanceTracker;
