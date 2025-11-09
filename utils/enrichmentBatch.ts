
import { LocalCatalogo, EnrichmentResult } from '@/types';
import { buscarYEnriquecerLocal, LocalEnriquecido } from './enrichmentService';

/**
 * Configuración de procesamiento por lotes
 */
export interface BatchConfig {
  // Tamaño del lote
  batchSize: number;
  
  // Pausa entre llamadas (ms)
  delayBetweenCalls: number;
  
  // Pausa entre lotes (ms)
  delayBetweenBatches: number;
  
  // Número máximo de reintentos
  maxRetries: number;
  
  // Continuar en caso de error
  continueOnError: boolean;
  
  // Guardar progreso cada N locales
  saveProgressEvery: number;
}

/**
 * Configuración por defecto
 */
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batchSize: 10,
  delayBetweenCalls: 300,
  delayBetweenBatches: 2000,
  maxRetries: 3,
  continueOnError: true,
  saveProgressEvery: 5,
};

/**
 * Estado del procesamiento por lotes
 */
export interface BatchState {
  totalLocales: number;
  procesados: number;
  exitosos: number;
  fallidos: number;
  enProceso: boolean;
  ultimoError?: string;
  resultados: (EnrichmentResult & { datosEnriquecidos?: LocalEnriquecido })[];
}

/**
 * Procesador de lotes con reintentos y recuperación de errores
 */
export class EnrichmentBatchProcessor {
  private config: BatchConfig;
  private state: BatchState;
  private onProgress?: (state: BatchState) => void;
  private onSaveProgress?: (state: BatchState) => Promise<void>;
  
  constructor(
    config: Partial<BatchConfig> = {},
    onProgress?: (state: BatchState) => void,
    onSaveProgress?: (state: BatchState) => Promise<void>
  ) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.onProgress = onProgress;
    this.onSaveProgress = onSaveProgress;
    
    this.state = {
      totalLocales: 0,
      procesados: 0,
      exitosos: 0,
      fallidos: 0,
      enProceso: false,
      resultados: [],
    };
  }
  
  /**
   * Procesar lista de locales
   */
  async procesarLocales(
    locales: LocalCatalogo[]
  ): Promise<(EnrichmentResult & { datosEnriquecidos?: LocalEnriquecido })[]> {
    console.log(`\n[Batch Processor] Starting batch processing...`);
    console.log(`[Batch Processor] Total locales: ${locales.length}`);
    console.log(`[Batch Processor] Batch size: ${this.config.batchSize}`);
    console.log(`[Batch Processor] Max retries: ${this.config.maxRetries}`);
    
    this.state = {
      totalLocales: locales.length,
      procesados: 0,
      exitosos: 0,
      fallidos: 0,
      enProceso: true,
      resultados: [],
    };
    
    try {
      // Dividir en lotes
      const batches = this.dividirEnLotes(locales, this.config.batchSize);
      console.log(`[Batch Processor] Total batches: ${batches.length}`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\n[Batch Processor] Processing batch ${i + 1}/${batches.length}`);
        
        await this.procesarLote(batch);
        
        // Pausa entre lotes (excepto el último)
        if (i < batches.length - 1) {
          console.log(`[Batch Processor] Waiting ${this.config.delayBetweenBatches}ms before next batch...`);
          await this.esperar(this.config.delayBetweenBatches);
        }
      }
      
      console.log(`\n[Batch Processor] ✅ Batch processing completed!`);
      console.log(`[Batch Processor] Successful: ${this.state.exitosos}/${this.state.totalLocales}`);
      console.log(`[Batch Processor] Failed: ${this.state.fallidos}/${this.state.totalLocales}`);
      
    } catch (error) {
      console.error('[Batch Processor] ❌ Fatal error:', error);
      this.state.ultimoError = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this.state.enProceso = false;
      
      // Guardar progreso final
      if (this.onSaveProgress) {
        await this.onSaveProgress(this.state);
      }
    }
    
    return this.state.resultados;
  }
  
  /**
   * Procesar un lote de locales
   */
  private async procesarLote(lote: LocalCatalogo[]): Promise<void> {
    for (const local of lote) {
      await this.procesarLocalConReintentos(local);
      
      // Actualizar progreso
      this.state.procesados++;
      
      if (this.onProgress) {
        this.onProgress(this.state);
      }
      
      // Guardar progreso periódicamente
      if (
        this.onSaveProgress &&
        this.state.procesados % this.config.saveProgressEvery === 0
      ) {
        await this.onSaveProgress(this.state);
      }
      
      // Pausa entre llamadas
      await this.esperar(this.config.delayBetweenCalls);
    }
  }
  
  /**
   * Procesar un local con reintentos
   */
  private async procesarLocalConReintentos(
    local: LocalCatalogo
  ): Promise<EnrichmentResult & { datosEnriquecidos?: LocalEnriquecido }> {
    let ultimoError: Error | null = null;
    
    for (let intento = 1; intento <= this.config.maxRetries; intento++) {
      try {
        console.log(`[Batch Processor] Processing: ${local.nombre} (attempt ${intento}/${this.config.maxRetries})`);
        
        const resultado = await buscarYEnriquecerLocal(local);
        
        // Actualizar estadísticas
        if (resultado.success) {
          this.state.exitosos++;
        } else {
          this.state.fallidos++;
        }
        
        // Guardar resultado
        this.state.resultados.push(resultado);
        
        return resultado;
        
      } catch (error) {
        ultimoError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[Batch Processor] ❌ Attempt ${intento} failed:`, error);
        
        // Si no es el último intento, esperar antes de reintentar
        if (intento < this.config.maxRetries) {
          const waitTime = intento * 1000; // Backoff exponencial
          console.log(`[Batch Processor] Waiting ${waitTime}ms before retry...`);
          await this.esperar(waitTime);
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    console.error(`[Batch Processor] ❌ All attempts failed for: ${local.nombre}`);
    
    this.state.fallidos++;
    
    const resultadoFallido: EnrichmentResult = {
      success: false,
      localCatalogoId: local.id,
      error: ultimoError?.message || 'Unknown error after all retries',
    };
    
    this.state.resultados.push(resultadoFallido);
    
    if (!this.config.continueOnError) {
      throw ultimoError;
    }
    
    return resultadoFallido;
  }
  
  /**
   * Dividir array en lotes
   */
  private dividirEnLotes<T>(array: T[], tamañoLote: number): T[][] {
    const lotes: T[][] = [];
    
    for (let i = 0; i < array.length; i += tamañoLote) {
      lotes.push(array.slice(i, i + tamañoLote));
    }
    
    return lotes;
  }
  
  /**
   * Esperar un tiempo determinado
   */
  private esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Obtener estado actual
   */
  getState(): BatchState {
    return { ...this.state };
  }
  
  /**
   * Cancelar procesamiento
   */
  cancelar(): void {
    console.log('[Batch Processor] Cancelling batch processing...');
    this.state.enProceso = false;
  }
}

/**
 * Función helper para procesamiento simple
 */
export async function procesarLoteSimple(
  locales: LocalCatalogo[],
  onProgress?: (actual: number, total: number) => void
): Promise<(EnrichmentResult & { datosEnriquecidos?: LocalEnriquecido })[]> {
  const processor = new EnrichmentBatchProcessor(
    {},
    (state) => {
      if (onProgress) {
        onProgress(state.procesados, state.totalLocales);
      }
    }
  );
  
  return processor.procesarLocales(locales);
}
