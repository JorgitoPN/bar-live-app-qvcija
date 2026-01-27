
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { googlePlacesDetails, buscarLocalConEstrategias } from '@/utils/googlePlacesApi';
import { mapGoogleTypesToBarlive, categorizarPorHorarios, mapearNivelPrecio } from '@/utils/enrichmentMapping';
import { validarLocalCompleto, estaEnEspana } from '@/utils/localTypesBackend';
import * as Clipboard from 'expo-clipboard';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { descargarYSubirFotosLocal, generarMetadatosFotos, verificarBucketSupabase } from '@/utils/enrichmentPhotos';
import { limpiarLocalOSMSiEnriquecido, estaLimpiezaAutomaticaHabilitada } from '@/utils/osmCleanupService';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

// Tipos de categorías
const CATEGORIAS = [
  { id: 'bar', nombre: 'Bar', emoji: '🍺' },
  { id: 'pub', nombre: 'Pub', emoji: '🍻' },
  { id: 'discoteca', nombre: 'Discoteca', emoji: '💃' },
  { id: 'cafe', nombre: 'Café', emoji: '☕' },
  { id: 'restaurante', nombre: 'Restaurante', emoji: '🍽️' },
  { id: 'cocteleria', nombre: 'Coctelería', emoji: '🍸' },
  { id: 'terraza', nombre: 'Terraza', emoji: '☀️' },
  { id: 'lounge', nombre: 'Lounge', emoji: '🛋️' },
  { id: 'rooftop', nombre: 'Rooftop', emoji: '🌆' },
];

// Comunidades y provincias de España
const COMUNIDADES_PROVINCIAS: Record<string, string[]> = {
  'Andalucía': ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
  'Aragón': ['Huesca', 'Teruel', 'Zaragoza'],
  'Asturias': ['Asturias'],
  'Baleares': ['Baleares'],
  'Canarias': ['Las Palmas', 'Santa Cruz de Tenerife'],
  'Cantabria': ['Cantabria'],
  'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
  'Castilla y León': ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
  'Cataluña': ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
  'Ceuta': ['Ceuta'],
  'Extremadura': ['Badajoz', 'Cáceres'],
  'Galicia': ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
  'La Rioja': ['La Rioja'],
  'Madrid': ['Madrid'],
  'Melilla': ['Melilla'],
  'Murcia': ['Murcia'],
  'Navarra': ['Navarra'],
  'País Vasco': ['Álava', 'Guipúzcoa', 'Vizcaya'],
  'Valencia': ['Alicante', 'Castellón', 'Valencia'],
};

interface EstadisticasCategoria {
  categoria: string;
  emoji: string;
  total: number;
  enriquecidos: number;
  pendientes: number;
  rechazados: number;
}

interface LogEntry {
  timestamp: string;
  tipo: 'info' | 'success' | 'error' | 'warning';
  mensaje: string;
}

interface LocalPendiente {
  id: string;
  nombre: string;
  direccion: string;
  tipo: string;
  provincia: string;
  latitud: number;
  longitud: number;
  source_id?: string;
  google_place_id?: string;
}

// Mapeo de días en español
const DIAS_SEMANA: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miercoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sabado',
};

// Maximum logs to keep in memory
const MAX_LOGS = 50;

/**
 * ✅ ENRIQUECIMIENTO GOOGLE v2.0 - CATALOG MIGRATION SYSTEM
 * 
 * NEW IN v2.0 (REDESIGNED AFTER CRITICAL INCIDENT):
 * - ✅ NEW: Automatic catalog migration (OSM → Google Places)
 * - ✅ NEW: Changes source_type instead of deleting records
 * - ✅ NEW: Maintains data integrity and foreign key references
 * - ✅ NEW: Separates OSM catalog (pending) from Google catalog (enriched)
 * - ✅ NEW: 100% safe - no data loss
 * 
 * CRITICAL FIXES v130.0:
 * - ✅ FIXED: Locales that fail with P0001 (duplicate) are now automatically deleted
 * - ✅ FIXED: Locales rejected during enrichment are automatically deleted
 * - ✅ FIXED: Prevents wasting money on repeated API calls for invalid locales
 * - ✅ FIXED: Keeps catalog clean by removing problematic locales
 * 
 * PREVIOUS FIXES v129.0:
 * - ✅ Category cards show correct counts
 * - ✅ Total = ALL locales in category (all sources)
 * - ✅ Enriquecidos = ALL ACTIVE locales (all sources)
 * - ✅ Pendientes = INACTIVE OSM locales without rejection
 * - ✅ Rechazados = INACTIVE locales with rejection notes
 * 
 * 🔄 FORCE RELOAD: Restart Expo dev server with --clear to see changes
 */

export default function EnriquecimientoGoogleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Estado del wizard
  const [paso, setPaso] = useState(1);
  const [comunidadSeleccionada, setComunidadSeleccionada] = useState('Madrid');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Madrid');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [reEnriquecer, setReEnriquecer] = useState(false);
  const [mostrarSelectorComunidad, setMostrarSelectorComunidad] = useState(false);
  const [mostrarSelectorProvincia, setMostrarSelectorProvincia] = useState(false);
  
  // Estadísticas
  const [estadisticas, setEstadisticas] = useState<{
    totalOSM: number;
    enriquecidos: number;
    rechazados: number;
    pendientes: number;
  }>({
    totalOSM: 0,
    enriquecidos: 0,
    rechazados: 0,
    pendientes: 0,
  });
  
  const [estadisticasCategorias, setEstadisticasCategorias] = useState<EstadisticasCategoria[]>([]);
  
  // Configuración de enriquecimiento
  const [localesPorLote, setLocalesPorLote] = useState(25);
  const [localesPendientes, setLocalesPendientes] = useState(0);
  const [localesAEnriquecer, setLocalesAEnriquecer] = useState<LocalPendiente[]>([]);
  
  // Estado de procesamiento
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [cargando, setCargando] = useState(false);

  // 📊 NUEVO: Estado de monitoreo de API
  const [apiStats, setApiStats] = useState({
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    rateLimitErrors: 0,
    callsPerMinute: 0,
    averageResponseTime: 0,
    lastCallTimestamp: null as Date | null,
    callTimestamps: [] as Date[],
  });

  const agregarLog = useCallback((tipo: LogEntry['tipo'], mensaje: string) => {
    const nuevoLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      tipo,
      mensaje,
    };
    setLogs(prev => [nuevoLog, ...prev].slice(0, MAX_LOGS));
  }, []);

  // 📊 NUEVO: Función para registrar llamada API
  const registrarLlamadaAPI = useCallback((exitosa: boolean, tiempoRespuesta: number, esRateLimit: boolean = false) => {
    const ahora = new Date();
    
    setApiStats(prev => {
      // Mantener solo las llamadas del último minuto
      const unMinutoAtras = new Date(ahora.getTime() - 60000);
      const llamadasRecientes = [...prev.callTimestamps, ahora].filter(
        timestamp => timestamp > unMinutoAtras
      );
      
      // Calcular llamadas por minuto
      const callsPerMinute = llamadasRecientes.length;
      
      // Calcular tiempo promedio de respuesta
      const totalCalls = prev.totalCalls + 1;
      const averageResponseTime = 
        (prev.averageResponseTime * prev.totalCalls + tiempoRespuesta) / totalCalls;
      
      return {
        totalCalls: totalCalls,
        successfulCalls: exitosa ? prev.successfulCalls + 1 : prev.successfulCalls,
        failedCalls: exitosa ? prev.failedCalls : prev.failedCalls + 1,
        rateLimitErrors: esRateLimit ? prev.rateLimitErrors + 1 : prev.rateLimitErrors,
        callsPerMinute,
        averageResponseTime,
        lastCallTimestamp: ahora,
        callTimestamps: llamadasRecientes,
      };
    });
  }, []);

  // 📊 NUEVO: Función para resetear estadísticas
  const resetearEstadisticasAPI = useCallback(() => {
    setApiStats({
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rateLimitErrors: 0,
      callsPerMinute: 0,
      averageResponseTime: 0,
      lastCallTimestamp: null,
      callTimestamps: [],
    });
    agregarLog('info', '📊 Estadísticas de API reseteadas');
  }, [agregarLog]);

  const copiarLogs = async () => {
    try {
      const logsTexto = logs
        .map(log => `[${log.timestamp}] ${log.tipo.toUpperCase()}: ${log.mensaje}`)
        .join('\n');
      
      await Clipboard.setStringAsync(logsTexto);
      Alert.alert('Logs copiados', 'Los logs se han copiado al portapapeles');
    } catch (error) {
      console.error('Error copiando logs:', error);
      Alert.alert('Error', 'No se pudieron copiar los logs');
    }
  };

  const cargarEstadisticas = useCallback(async () => {
    performanceMonitor.start('cargarEstadisticas');
    setCargando(true);
    agregarLog('info', `Cargando estadísticas para ${provinciaSeleccionada}...`);
    
    try {
      console.log('[Enrichment v130.0] 🔄 LOADING STATISTICS - AUTO-DELETE ENABLED');
      console.log('[Enrichment v130.0] 📍 Province:', provinciaSeleccionada);

      // Query ALL locales from the province (NO source_type filter)
      const { data: allLocalesData, error: allLocalesError } = await supabase
        .from('locales')
        .select('id, source_type, enriquecido, tipo, activo, notas_rechazo')
        .eq('provincia', provinciaSeleccionada);
      
      console.log('[Enrichment v130.0] ✅ Query executed - ALL locales from province (all sources)');
      console.log('[Enrichment v130.0] 🔍 Raw query result count:', allLocalesData?.length || 0);

      if (allLocalesError) {
        console.error('[Enrichment v130.0] ❌ Error loading stats:', allLocalesError);
        agregarLog('error', `Error al cargar estadísticas: ${allLocalesError.message}`);
        performanceMonitor.end('cargarEstadisticas');
        setCargando(false);
        return;
      }

      if (!allLocalesData) {
        console.error('[Enrichment v130.0] ❌ No data returned from query');
        agregarLog('error', 'No se recibieron datos de la base de datos');
        performanceMonitor.end('cargarEstadisticas');
        setCargando(false);
        return;
      }

      console.log('[Enrichment v130.0] ✅ Total locales in province (ALL sources):', allLocalesData.length);

      // Calculate statistics
      const totalLocales = allLocalesData.length;
      
      // Count by source type
      const totalOSM = allLocalesData.filter(l => l.source_type === 'osm').length;
      const totalManual = allLocalesData.filter(l => l.source_type === 'manual').length;
      const totalGoogle = allLocalesData.filter(l => l.source_type === 'google').length;
      const totalOtros = allLocalesData.filter(l => 
        l.source_type !== 'osm' && 
        l.source_type !== 'manual' && 
        l.source_type !== 'google'
      ).length;
      
      // Count ALL active locales (not just OSM)
      const totalActivos = allLocalesData.filter(l => l.activo === true).length;
      const totalInactivos = allLocalesData.filter(l => l.activo === false).length;
      
      // Enriquecidos = ALL ACTIVE locales (activo = true)
      const enriquecidos = totalActivos;
      
      // Pendientes = INACTIVE OSM locales (activo = false, no rejection notes)
      const pendientes = allLocalesData.filter(l => 
        l.source_type === 'osm' &&
        l.activo === false && 
        (l.notas_rechazo === null || l.notas_rechazo === undefined)
      ).length;
      
      // Rechazados = inactivos con notas de rechazo
      const rechazados = allLocalesData.filter(l => 
        l.activo === false && l.notas_rechazo !== null
      ).length;

      console.log('[Enrichment v130.0] 📊 STATISTICS BREAKDOWN:');
      console.log('[Enrichment v130.0]   Total locales (all sources):', totalLocales);
      console.log('[Enrichment v130.0]   Total OSM:', totalOSM);
      console.log('[Enrichment v130.0]   Total Manual:', totalManual);
      console.log('[Enrichment v130.0]   Total Google:', totalGoogle);
      console.log('[Enrichment v130.0]   Total Otros:', totalOtros);
      console.log('[Enrichment v130.0]   Total activos (ALL sources):', totalActivos);
      console.log('[Enrichment v130.0]   Total inactivos:', totalInactivos);
      console.log('[Enrichment v130.0]   Enriquecidos (ALL active):', enriquecidos);
      console.log('[Enrichment v130.0]   Pendientes (OSM inactivos):', pendientes);
      console.log('[Enrichment v130.0]   Rechazados (inactivos con rechazo):', rechazados);
      
      // VALIDATION: Check if numbers make sense
      if (enriquecidos + pendientes + rechazados > totalLocales) {
        console.error('[Enrichment v130.0] ⚠️ WARNING: Sum > total - Data inconsistency!');
        agregarLog('warning', '⚠️ Inconsistencia detectada en los datos');
      }

      const newEstadisticas = {
        totalOSM,
        enriquecidos,
        rechazados,
        pendientes,
      };

      setEstadisticas(newEstadisticas);

      // Category statistics
      console.log('[Enrichment v130.0] 📊 Calculating category statistics...');
      const statsCategorias: EstadisticasCategoria[] = CATEGORIAS.map(cat => {
        // Filter by category ID (tipo field) - ONLY OSM LOCALES (enrichable)
        const localesOSMCategoria = allLocalesData.filter(l => 
          l.tipo === cat.id && l.source_type === 'osm'
        );
        
        // Count ALL locales in this category (all sources) for reference
        const todosLocalesCategoria = allLocalesData.filter(l => l.tipo === cat.id);
        const totalTodosLocales = todosLocalesCategoria.length;
        const activosTodosLocales = todosLocalesCategoria.filter(l => l.activo === true).length;
        
        const total = totalTodosLocales;
        const enriquecidosCategoria = activosTodosLocales;
        
        // Pendientes = INACTIVE OSM locales without rejection notes
        const pendientesCategoria = localesOSMCategoria.filter(l => 
          l.activo === false && 
          (l.notas_rechazo === null || l.notas_rechazo === undefined)
        ).length;
        
        // Rechazados = ALL inactive locales with rejection notes (any source)
        const rechazadosCategoria = todosLocalesCategoria.filter(l => 
          l.activo === false && l.notas_rechazo !== null
        ).length;

        console.log(`[Enrichment v130.0] 📊 Category ${cat.nombre}:`, {
          total,
          enriquecidos: enriquecidosCategoria,
          pendientes: pendientesCategoria,
          rechazados: rechazadosCategoria,
          osmLocales: localesOSMCategoria.length,
          activosTodos: activosTodosLocales,
        });

        return {
          categoria: cat.nombre,
          emoji: cat.emoji,
          total,
          enriquecidos: enriquecidosCategoria,
          pendientes: pendientesCategoria,
          rechazados: rechazadosCategoria,
        };
      });

      console.log('[Enrichment v130.0] ✅ Category statistics calculated');

      setEstadisticasCategorias(statsCategorias);
      
      if (totalOSM === 0) {
        agregarLog('warning', `⚠️ No hay locales importados de OSM en ${provinciaSeleccionada}`);
        agregarLog('info', 'Ve a "Importación OSM" para importar locales primero');
      } else {
        agregarLog('success', `✅ Estadísticas cargadas correctamente`);
        agregarLog('info', `📊 Total locales en provincia: ${totalLocales}`);
        agregarLog('info', `📊 Por fuente: OSM=${totalOSM}, Manual=${totalManual}, Google=${totalGoogle}, Otros=${totalOtros}`);
        agregarLog('info', `📊 Activos (TODAS las fuentes): ${totalActivos} | Inactivos: ${totalInactivos}`);
        agregarLog('info', `📊 Enriquecidos: ${enriquecidos} | Pendientes (OSM): ${pendientes} | Rechazados: ${rechazados}`);
        agregarLog('info', `💡 Los locales activos incluyen todas las fuentes (OSM, manual, Google, etc.)`);
      }
    } catch (error) {
      console.error('[Enrichment v130.0] ❌ Error cargando estadísticas:', error);
      agregarLog('error', `Error al cargar estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setCargando(false);
      performanceMonitor.end('cargarEstadisticas');
    }
  }, [provinciaSeleccionada, agregarLog]);

  // Cargar estadísticas al cambiar provincia
  useEffect(() => {
    if (paso === 2) {
      cargarEstadisticas();
    }
  }, [provinciaSeleccionada, paso, cargarEstadisticas]);

  const sincronizarCatalogo = async () => {
    agregarLog('info', 'Sincronizando catálogo OSM...');
    Alert.alert(
      'Sincronizar Catálogo',
      'Esta función actualizará las estadísticas desde la base de datos OSM. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sincronizar',
          onPress: async () => {
            setCargando(true);
            try {
              await cargarEstadisticas();
              agregarLog('success', 'Catálogo sincronizado correctamente');
            } catch (error) {
              agregarLog('error', 'Error al sincronizar catálogo');
            } finally {
              setCargando(false);
            }
          },
        },
      ]
    );
  };

  const seleccionarCategoria = async (categoria: string) => {
    performanceMonitor.start('seleccionarCategoria');
    setCategoriaSeleccionada(categoria);
    const stats = estadisticasCategorias.find(s => s.categoria === categoria);
    
    if (stats) {
      const numPendientes = reEnriquecer ? stats.total : stats.pendientes;
      setLocalesPendientes(numPendientes);
      
      // Cargar locales pendientes de esta categoría
      agregarLog('info', `Cargando locales de categoría ${categoria}...`);
      agregarLog('info', `Modo: ${reEnriquecer ? 'Re-enriquecer (todos)' : 'Solo pendientes (no enriquecidos)'}`);
      
      try {
        const categoriaId = CATEGORIAS.find(c => c.nombre === categoria)?.id || 'bar';
        
        // Build query - ACTIVE = ENRICHED, INACTIVE OSM = PENDING
        let query = supabase
          .from('locales')
          .select('id, nombre, direccion, tipo, provincia, latitud, longitud, source_id, google_place_id, enriquecido, activo, notas_rechazo, source_type')
          .eq('provincia', provinciaSeleccionada)
          .eq('tipo', categoriaId)
          .eq('source_type', 'osm'); // Only OSM locales can be enriched through this tool
        
        // When NOT re-enriching, show ONLY INACTIVE OSM locales (pending)
        if (!reEnriquecer) {
          query = query.eq('activo', false);
          // Exclude rejected locales (those with rejection notes)
          query = query.is('notas_rechazo', null);
          agregarLog('info', '🔍 Filtrando: Solo locales OSM INACTIVOS sin notas de rechazo (pendientes)');
          agregarLog('info', '📋 Los locales activos ya están enriquecidos');
        } else {
          agregarLog('info', '🔍 Mostrando: TODOS los locales OSM (activos e inactivos)');
          agregarLog('info', '📋 Modo re-enriquecimiento: Se actualizarán locales ya enriquecidos');
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('[Enrichment v130.0] Error loading locales:', error);
          agregarLog('error', `Error al cargar locales: ${error.message}`);
          setLocalesAEnriquecer([]);
        } else {
          console.log('[Enrichment v130.0] Locales loaded:', {
            total: data?.length || 0,
            active: data?.filter(l => l.activo === true).length || 0,
            inactive: data?.filter(l => l.activo === false).length || 0,
            rejected: data?.filter(l => l.notas_rechazo !== null).length || 0,
            reEnriquecer,
          });
          
          setLocalesAEnriquecer(data || []);
          
          const activeCount = data?.filter(l => l.activo === true).length || 0;
          const inactiveCount = data?.filter(l => l.activo === false).length || 0;
          const rejectedCount = data?.filter(l => l.notas_rechazo !== null).length || 0;
          
          agregarLog('success', `✅ ${data?.length || 0} locales cargados`);
          agregarLog('info', `📊 Activos (enriquecidos): ${activeCount}`);
          agregarLog('info', `📊 Inactivos (pendientes): ${inactiveCount}`);
          if (rejectedCount > 0) {
            agregarLog('info', `📊 Rechazados: ${rejectedCount}`);
          }
          
          // Update the pending count to match what was actually loaded
          setLocalesPendientes(data?.length || 0);
          
          // VALIDATION: Warn if no locales are available
          if ((data?.length || 0) === 0) {
            if (!reEnriquecer) {
              agregarLog('info', '✅ No hay locales pendientes en esta categoría');
              agregarLog('info', '💡 Todos los locales ya están enriquecidos o rechazados');
            } else {
              agregarLog('warning', '⚠️ No hay locales disponibles para re-enriquecer en esta categoría');
            }
          }
          
          // INFO: Show breakdown
          if (inactiveCount > 0 && !reEnriquecer) {
            agregarLog('info', `📋 ${inactiveCount} locales inactivos listos para enriquecer`);
            agregarLog('info', '💡 Los locales se activarán automáticamente al enriquecerse exitosamente');
          }
        }
      } catch (error) {
        console.error('[Enrichment v130.0] Error:', error);
        agregarLog('error', `Error al cargar locales: ${error}`);
        setLocalesAEnriquecer([]);
      }
    }
    
    setPaso(3);
    performanceMonitor.end('seleccionarCategoria');
  };

  const calcularCosteEstimado = (numLocales: number): string => {
    // Cada enriquecimiento hace 2 llamadas: búsqueda + detalles
    // Más 4 llamadas por fotos (máximo)
    const coste = numLocales * (2 + 4) * 0.017; // $0.017 por llamada
    return coste.toFixed(2);
  };

  /**
   * 🗑️ v130.0: FUNCIÓN PARA EXCLUIR Y ELIMINAR LOCAL RECHAZADO
   * Esta función se llama cuando un local es rechazado durante el enriquecimiento
   * o cuando falla la actualización por duplicado (error P0001)
   */
  const excluirYEliminarLocalRechazado = async (
    local: LocalPendiente,
    motivoRechazo: string
  ): Promise<void> => {
    try {
      console.log(`[Exclusion v130.0] 🗑️ Excluyendo local rechazado: ${local.nombre}`);
      console.log(`[Exclusion v130.0] 📝 Motivo: ${motivoRechazo}`);
      
      // 1. Agregar a locales_excluidos
      const { error: insertError } = await supabase
        .from('locales_excluidos')
        .insert({
          local_id: local.id,
          nombre: local.nombre,
          direccion: local.direccion,
          latitud: local.latitud,
          longitud: local.longitud,
          google_place_id: local.google_place_id || null,
          osm_id: local.source_id || null,
          motivo_exclusion: 'invalido',
          descripcion_exclusion: motivoRechazo,
          excluido_por: user?.id || null,
          metadata: {
            tipo_original: local.tipo,
            source_type: 'osm',
            source_id: local.source_id,
            fecha_exclusion: new Date().toISOString(),
          },
        });

      if (insertError) {
        console.error('[Exclusion v130.0] ❌ Error inserting into locales_excluidos:', insertError);
        // Continuar con la eliminación aunque falle la inserción
      } else {
        console.log('[Exclusion v130.0] ✅ Local agregado a locales_excluidos');
      }

      // 2. Eliminar de la tabla locales
      const { error: deleteError } = await supabase
        .from('locales')
        .delete()
        .eq('id', local.id);

      if (deleteError) {
        console.error('[Exclusion v130.0] ❌ Error deleting from locales:', deleteError);
        agregarLog('error', `❌ Error al eliminar ${local.nombre} de la base de datos`);
      } else {
        console.log('[Exclusion v130.0] ✅ Local eliminado de la tabla locales');
        agregarLog('success', `🗑️ ${local.nombre} eliminado del catálogo`);
      }
    } catch (error) {
      console.error('[Exclusion v130.0] ❌ Error in excluirYEliminarLocalRechazado:', error);
      agregarLog('error', `❌ Error al excluir ${local.nombre}`);
    }
  };

  const iniciarEnriquecimiento = async () => {
    const localesAProcesar = Math.min(localesPorLote, localesPendientes, localesAEnriquecer.length);
    
    if (localesAProcesar === 0) {
      Alert.alert('Sin locales', 'No hay locales pendientes de enriquecer');
      return;
    }

    // VERIFICAR QUE EL BUCKET DE SUPABASE EXISTE ANTES DE EMPEZAR
    agregarLog('info', '🔍 Verificando bucket de Supabase Storage...');
    const bucketCheck = await verificarBucketSupabase();
    
    if (!bucketCheck.exists) {
      agregarLog('error', '❌ Bucket "locales" no encontrado en Supabase Storage');
      
      Alert.alert(
        '🗄️ Bucket de Supabase no encontrado',
        'El bucket "locales" no existe en Supabase Storage.\n\n' +
        'Para poder subir fotos, necesitas crear este bucket primero:\n\n' +
        '1. Ve a tu Dashboard de Supabase\n' +
        '2. Haz clic en "Storage" en el menú lateral\n' +
        '3. Crea un nuevo bucket llamado "locales"\n' +
        '4. Márcalo como público\n' +
        '5. Configura las políticas de acceso\n\n' +
        'Consulta la guía completa en:\ndocs/SUPABASE_STORAGE_SETUP.md',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Guía',
            onPress: () => {
              Alert.alert(
                'Guía de Configuración',
                'Pasos para crear el bucket:\n\n' +
                '1. Dashboard de Supabase → Storage\n' +
                '2. Click en "New bucket"\n' +
                '3. Nombre: "locales"\n' +
                '4. Público: SÍ ✅\n' +
                '5. Crear políticas de acceso\n\n' +
                'Consulta docs/SUPABASE_STORAGE_SETUP.md para más detalles.'
              );
            },
          },
        ]
      );
      return;
    }
    
    agregarLog('success', '✅ Bucket de Supabase verificado correctamente');

    const coste = calcularCosteEstimado(localesAProcesar);
    
    Alert.alert(
      'Confirmar Enriquecimiento',
      `Se procesarán ${localesAProcesar} locales de la categoría "${categoriaSeleccionada}".\n\n📸 Las fotos se descargarán de Google Places y se subirán a Supabase Storage.\n\n🔍 Se usarán 5 estrategias de búsqueda para maximizar resultados.\n\n🗑️ Los locales rechazados o duplicados se eliminarán automáticamente del catálogo.\n\nCoste estimado: $${coste}\n\n¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enriquecer',
          onPress: () => procesarEnriquecimiento(localesAProcesar),
        },
      ]
    );
  };

  // Función para convertir horarios de Google a formato estructurado
  const convertirHorariosCompletos = (openingHours: any) => {
    if (!openingHours || !openingHours.periods) {
      return {};
    }

    const horarios: Record<string, string[]> = {
      lunes: [],
      martes: [],
      miercoles: [],
      jueves: [],
      viernes: [],
      sabado: [],
      domingo: [],
    };

    try {
      openingHours.periods.forEach((period: any) => {
        const dia = DIAS_SEMANA[period.open.day];
        if (dia) {
          const horaApertura = period.open.time.substring(0, 2) + ':' + period.open.time.substring(2);
          const horaCierre = period.close 
            ? period.close.time.substring(0, 2) + ':' + period.close.time.substring(2)
            : '23:59';
          
          horarios[dia].push(`${horaApertura}–${horaCierre}`);
        }
      });

      // Marcar días cerrados
      Object.keys(horarios).forEach(dia => {
        if (horarios[dia].length === 0) {
          horarios[dia] = ['Cerrado'];
        }
      });
    } catch (error) {
      console.error('Error converting schedules:', error);
    }

    return horarios;
  };

  // Función para determinar estado actual
  const determinarEstadoActual = (openingHours: any): string => {
    if (!openingHours) {
      return 'desconocido';
    }

    if (openingHours.open_now === true) {
      return 'abierto_ahora';
    } else if (openingHours.open_now === false) {
      return 'cerrado_ahora';
    }

    return 'desconocido';
  };

  const procesarEnriquecimiento = async (numLocales: number) => {
    performanceMonitor.start('procesarEnriquecimiento');
    setProcesando(true);
    setProgreso({ actual: 0, total: numLocales });
    
    // 📊 NUEVO: Resetear estadísticas de API al iniciar
    resetearEstadisticasAPI();
    
    agregarLog('info', `🚀 Iniciando enriquecimiento de ${numLocales} locales...`);
    agregarLog('info', '📸 Las fotos se descargarán y subirán a Supabase Storage');
    agregarLog('info', '🔍 Usando búsqueda multi-estrategia (5 estrategias)');
    agregarLog('info', '🗑️ Los locales rechazados o duplicados se eliminarán automáticamente');
    agregarLog('info', '📊 Monitoreo de API activado - detectando límites de velocidad');

    let exitosos = 0;
    let fallidos = 0;
    let rechazados = 0;

    try {
      const localesAProcesar = localesAEnriquecer.slice(0, numLocales);
      
      for (let i = 0; i < localesAProcesar.length; i++) {
        const local = localesAProcesar[i];
        setProgreso({ actual: i + 1, total: numLocales });
        
        agregarLog('info', `[${i + 1}/${numLocales}] Procesando: ${local.nombre}...`);
        
        try {
          performanceMonitor.start(`enrich_${local.id}`);
          
          // 📊 NUEVO: Registrar inicio de llamada API
          const inicioLlamada = Date.now();
          
          // 🔍 PASO 1: Buscar en Google Places con múltiples estrategias
          let placeResult;
          try {
            placeResult = await buscarLocalConEstrategias({
              nombre: local.nombre,
              direccion: local.direccion,
              provincia: local.provincia,
              tipo: local.tipo,
              latitud: local.latitud,
              longitud: local.longitud,
            });
            
            // 📊 NUEVO: Registrar llamada exitosa
            const tiempoRespuesta = Date.now() - inicioLlamada;
            registrarLlamadaAPI(true, tiempoRespuesta);
            
          } catch (error: any) {
            // 📊 NUEVO: Detectar error de rate limit
            const tiempoRespuesta = Date.now() - inicioLlamada;
            const esRateLimit = error?.response?.status === 429 || 
                               error?.message?.includes('429') ||
                               error?.message?.includes('rate limit') ||
                               error?.message?.includes('RESOURCE_EXHAUSTED');
            
            registrarLlamadaAPI(false, tiempoRespuesta, esRateLimit);
            
            if (esRateLimit) {
              agregarLog('error', `⚠️ RATE LIMIT DETECTADO - Pausando 60 segundos...`);
              agregarLog('warning', `📊 Llamadas por minuto: ${apiStats.callsPerMinute}`);
              agregarLog('warning', `📊 Total de errores de rate limit: ${apiStats.rateLimitErrors + 1}`);
              
              // Pausar por 60 segundos
              await new Promise(resolve => setTimeout(resolve, 60000));
              
              agregarLog('info', '✅ Reanudando después de pausa por rate limit');
              
              // Reintentar la llamada
              try {
                const inicioReintento = Date.now();
                placeResult = await buscarLocalConEstrategias({
                  nombre: local.nombre,
                  direccion: local.direccion,
                  provincia: local.provincia,
                  tipo: local.tipo,
                  latitud: local.latitud,
                  longitud: local.longitud,
                });
                const tiempoReintento = Date.now() - inicioReintento;
                registrarLlamadaAPI(true, tiempoReintento);
              } catch (retryError) {
                agregarLog('error', `❌ Error en reintento: ${retryError}`);
                throw retryError;
              }
            } else {
              throw error;
            }
          }
          
          if (!placeResult || !placeResult.place_id) {
            agregarLog('warning', `⚠️ No encontrado en Google: ${local.nombre}`);
            agregarLog('info', `🗑️ Excluyendo ${local.nombre} del catálogo...`);
            
            // EXCLUIR Y ELIMINAR local no encontrado
            await excluirYEliminarLocalRechazado(local, 'No encontrado en Google Places');
            rechazados++;
            fallidos++;
            performanceMonitor.end(`enrich_${local.id}`);
            continue;
          }
          
          // 🔍 PASO 2: Obtener detalles completos
          let details;
          try {
            const inicioDetalles = Date.now();
            details = await googlePlacesDetails(placeResult.place_id, [
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
            
            // 📊 NUEVO: Registrar llamada de detalles
            const tiempoDetalles = Date.now() - inicioDetalles;
            registrarLlamadaAPI(true, tiempoDetalles);
            
          } catch (error: any) {
            const tiempoDetalles = Date.now() - inicioLlamada;
            const esRateLimit = error?.response?.status === 429 || 
                               error?.message?.includes('429') ||
                               error?.message?.includes('rate limit') ||
                               error?.message?.includes('RESOURCE_EXHAUSTED');
            
            registrarLlamadaAPI(false, tiempoDetalles, esRateLimit);
            
            if (esRateLimit) {
              agregarLog('error', `⚠️ RATE LIMIT en detalles - Pausando 60 segundos...`);
              agregarLog('warning', `📊 Llamadas por minuto: ${apiStats.callsPerMinute}`);
              
              await new Promise(resolve => setTimeout(resolve, 60000));
              
              agregarLog('info', '✅ Reanudando después de pausa');
              
              // Reintentar
              const inicioReintento = Date.now();
              details = await googlePlacesDetails(placeResult.place_id, [
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
              const tiempoReintento = Date.now() - inicioReintento;
              registrarLlamadaAPI(true, tiempoReintento);
            } else {
              throw error;
            }
          }
          
          if (!details) {
            agregarLog('warning', `⚠️ Sin detalles: ${local.nombre}`);
            agregarLog('info', `🗑️ Excluyendo ${local.nombre} del catálogo...`);
            
            // EXCLUIR Y ELIMINAR local sin detalles
            await excluirYEliminarLocalRechazado(local, 'Sin detalles en Google Places');
            rechazados++;
            fallidos++;
            performanceMonitor.end(`enrich_${local.id}`);
            continue;
          }
          
          // ✅ PASO 3: VALIDAR LOCAL CON SISTEMA DE DISCRIMINACIÓN
          agregarLog('info', `🔍 Validando: ${local.nombre}...`);
          const validacionCompleta = validarLocalCompleto(details, local.tipo);
          
          if (!validacionCompleta.valido) {
            agregarLog('error', `❌ RECHAZADO: ${local.nombre} - ${validacionCompleta.razon}`);
            agregarLog('info', `🗑️ Excluyendo ${local.nombre} del catálogo...`);
            
            // EXCLUIR Y ELIMINAR local rechazado
            await excluirYEliminarLocalRechazado(local, validacionCompleta.razon || 'Validación fallida');
            rechazados++;
            performanceMonitor.end(`enrich_${local.id}`);
            continue;
          }
          
          // ✅ PASO 4: VALIDAR UBICACIÓN (España)
          const enEspana = estaEnEspana(
            details.formatted_address,
            details.plus_code?.global_code
          );
          
          if (!enEspana) {
            agregarLog('error', `❌ RECHAZADO: ${local.nombre} - Local fuera de España`);
            agregarLog('info', `🗑️ Excluyendo ${local.nombre} del catálogo...`);
            
            // EXCLUIR Y ELIMINAR local fuera de España
            await excluirYEliminarLocalRechazado(local, 'Local fuera de España');
            rechazados++;
            performanceMonitor.end(`enrich_${local.id}`);
            continue;
          }
          
          // 🎯 PASO 5: CATEGORIZACIÓN MEJORADA (con análisis de nombre)
          let barliveTypes = mapGoogleTypesToBarlive(details.types || [], details.name || local.nombre);
          if (details.opening_hours) {
            barliveTypes = categorizarPorHorarios(details.opening_hours, barliveTypes);
          }
          const barliveType = barliveTypes[0] || 'bar';
          
          // 💰 NIVEL DE PRECIO
          const nivelPrecio = details.price_level;
          const rangoPrecio = mapearNivelPrecio(nivelPrecio);
          
          // 🔗 ENLACES IMPORTANTES
          const googleMapsUrl = details.url;
          const plusCode = details.plus_code?.global_code;
          const plusCodeCompound = details.plus_code?.compound_code;
          
          // 📅 Convertir horarios a formato estructurado
          const horariosCompletos = convertirHorariosCompletos(details.opening_hours);
          const horariosTexto = details.opening_hours?.weekday_text || [];
          const estadoActual = determinarEstadoActual(details.opening_hours);

          // 💬 Procesar reviews (primeras 5)
          const reviewsGoogle = details.reviews?.slice(0, 5).map((review: any) => ({
            author_name: review.author_name,
            author_photo: review.profile_photo_url,
            rating: review.rating,
            text: review.text,
            time: review.time,
            relative_time_description: review.relative_time_description,
            language: review.language,
          })) || [];

          // 📸 PASO 6: DESCARGAR Y SUBIR FOTOS A SUPABASE
          agregarLog('info', `📸 Descargando fotos de ${local.nombre}...`);
          let galeriaUrls: string[] = [];
          let imagenUrl: string | null = null;
          
          try {
            galeriaUrls = await descargarYSubirFotosLocal(local.id, details, 4);
            if (galeriaUrls.length > 0) {
              imagenUrl = galeriaUrls[0];
              agregarLog('success', `📸 ${galeriaUrls.length} fotos subidas a Supabase`);
            } else {
              agregarLog('warning', `⚠️ No se pudieron descargar fotos para ${local.nombre}`);
            }
          } catch (error) {
            console.error('Error downloading photos:', error);
            agregarLog('error', `❌ Error descargando fotos: ${error}`);
            
            // Si es un error de bucket, detener el proceso completo
            if (error instanceof Error && error.message.includes('Bucket')) {
              agregarLog('error', '❌ Deteniendo enriquecimiento por error de bucket');
              throw error;
            }
          }

          // 📸 GENERAR METADATOS DE FOTOS (para referencia)
          const fotosGoogle = generarMetadatosFotos(details, 4);

          // 🍴 Extraer tipos de cocina y música
          const tiposCocina: string[] = [];
          const cocinaKeywords: Record<string, string[]> = {
            'Mediterránea': ['mediterranean', 'mediterránea'],
            'Española': ['spanish', 'española', 'tapas'],
            'Italiana': ['italian', 'italiana', 'pizza', 'pasta'],
            'Japonesa': ['japanese', 'japonesa', 'sushi'],
            'Mexicana': ['mexican', 'mexicana', 'tacos'],
            'Asiática': ['asian', 'asiática'],
            'Tradicional': ['traditional', 'tradicional'],
          };
          
          const allReviewText = reviewsGoogle.map((r: any) => r.text?.toLowerCase() || '').join(' ');
          const editorialText = details.editorial_summary?.overview?.toLowerCase() || '';
          const searchText = allReviewText + ' ' + editorialText;
          
          for (const [cocina, keywords] of Object.entries(cocinaKeywords)) {
            for (const keyword of keywords) {
              if (searchText.includes(keyword)) {
                tiposCocina.push(cocina);
                break;
              }
            }
          }
          
          // Música principal
          let musicaPrincipal = 'ambiental';
          if (searchText.includes('live music') || searchText.includes('música en vivo')) {
            musicaPrincipal = 'en_vivo';
          } else if (searchText.includes('dj') || barliveTypes.includes('discoteca')) {
            musicaPrincipal = 'dj';
          }
          
          // 🎭 Extraer ambiente completo
          const ambienteCompleto = {
            acogedor: searchText.includes('acogedor') || searchText.includes('cozy'),
            romantico: searchText.includes('romántico') || searchText.includes('romantic'),
            elegante: searchText.includes('elegante') || searchText.includes('elegant'),
            moderno: searchText.includes('moderno') || searchText.includes('modern'),
            de_moda: searchText.includes('trendy') || searchText.includes('popular'),
            animado: searchText.includes('animado') || searchText.includes('lively'),
            juvenil: searchText.includes('juvenil') || searchText.includes('young'),
            tranquilo: searchText.includes('tranquilo') || searchText.includes('quiet'),
            familiar: searchText.includes('familiar') || searchText.includes('family'),
            tematico: searchText.includes('temático') || searchText.includes('themed'),
          };
          
          // 👥 Extraer clientela
          const clientela = {
            grupos: searchText.includes('grupo') || searchText.includes('groups'),
            turistas: searchText.includes('turista') || searchText.includes('tourist') || (details.user_ratings_total && details.user_ratings_total > 500),
            familias: searchText.includes('familia') || searchText.includes('family'),
            ninos_bienvenidos: searchText.includes('niños') || searchText.includes('kids'),
            estudiantes: searchText.includes('estudiante') || searchText.includes('student'),
            lgtbi_friendly: searchText.includes('lgbtq') || searchText.includes('lgbt'),
            parejas: searchText.includes('pareja') || searchText.includes('couple'),
          };
          
          // 💳 Extraer métodos de pago
          const metodosPagoCompletos = {
            efectivo: true,
            tarjetas_credito: true,
            tarjetas_debito: true,
            pago_movil: searchText.includes('apple pay') || searchText.includes('google pay'),
            american_express: searchText.includes('american express') || searchText.includes('amex'),
            mastercard: true,
            visa: true,
            bizum: searchText.includes('bizum'),
            vales_restaurante: searchText.includes('vale') || searchText.includes('ticket restaurant'),
            factura_disponible: true,
          };
          
          // 🧠 Análisis de reviews
          const palabrasClave: string[] = [];
          const keywords = ['acogedor', 'buen servicio', 'terraza', 'vino', 'comida', 'ambiente', 'precio', 'calidad'];
          keywords.forEach(keyword => {
            if (searchText.includes(keyword)) {
              palabrasClave.push(keyword);
            }
          });
          
          let sentimiento = 'neutral';
          if (details.rating) {
            if (details.rating >= 4.5) sentimiento = 'muy positivo';
            else if (details.rating >= 4.0) sentimiento = 'positivo';
            else if (details.rating >= 3.0) sentimiento = 'neutral';
            else if (details.rating >= 2.0) sentimiento = 'negativo';
            else sentimiento = 'muy negativo';
          }
          
          const analisisReviews = {
            palabras_clave_detectadas: palabrasClave.slice(0, 10),
            sentimiento_general: sentimiento,
            puntuacion_media_reviews: details.rating || 0,
            volumen_reviews: details.user_ratings_total || 0,
            idioma_predominante: 'es',
            fuente: ['Google Maps'],
            palabras_destacadas_google: palabrasClave.slice(0, 5),
            resumen_automatico: details.rating && details.rating >= 4.0 
              ? `Los usuarios destacan ${palabrasClave.slice(0, 3).join(', ')}.`
              : 'Los usuarios tienen opiniones mixtas sobre este local.',
          };
          
          // 🍽️ Extraer servicios disponibles completos
          const serviciosDisponibles = {
            // Bebidas
            cerveza: barliveTypes.includes('bar') || barliveTypes.includes('pub'),
            vino: barliveTypes.includes('vinoteca') || barliveTypes.includes('cocteleria'),
            cocteles: barliveTypes.includes('cocteleria') || barliveTypes.includes('bar'),
            cafe: barliveTypes.includes('cafe'),
            // Comidas
            desayuno: barliveTypes.includes('cafe'),
            almuerzo: barliveTypes.includes('restaurante'),
            cena: barliveTypes.includes('restaurante'),
            para_llevar: (details.types || []).includes('meal_takeaway'),
            entrega_domicilio: (details.types || []).includes('meal_delivery'),
            terraza_exterior: searchText.includes('terraza') || searchText.includes('terrace'),
            // Facilidades
            wifi_gratis: searchText.includes('wifi'),
            aparcamiento: searchText.includes('parking') || searchText.includes('aparcamiento'),
            accesible_silla_ruedas: searchText.includes('accesible') || searchText.includes('accessible'),
            // Pagos
            pago_tarjetas: true,
            pago_efectivo: true,
            // Opciones dietéticas
            comida_vegetariana: searchText.includes('vegetarian') || searchText.includes('vegetariano'),
            opciones_veganas: searchText.includes('vegan') || searchText.includes('vegano'),
            sin_gluten: searchText.includes('gluten free') || searchText.includes('sin gluten'),
            // Entretenimiento
            musica_vivo: searchText.includes('live music') || searchText.includes('música en vivo'),
            dj: searchText.includes('dj') || barliveTypes.includes('discoteca'),
            deportes_tv: searchText.includes('tv') || searchText.includes('deportes'),
          };

          // ✅ PASO 7: Actualizar local en Supabase con TODOS los datos
          const { error: updateError } = await supabase
            .from('locales')
            .update({
              // 📍 Datos básicos mejorados
              nombre: details.name || local.nombre,
              direccion: details.formatted_address || local.direccion,
              latitud: details.geometry?.location?.lat || local.latitud,
              longitud: details.geometry?.location?.lng || local.longitud,
              telefono: details.formatted_phone_number,
              telefono_internacional: details.international_phone_number,
              website: details.website,
              
              // ⭐ Valoraciones y reseñas
              google_rating: details.rating,
              google_user_ratings_total: details.user_ratings_total,
              reviews_google: reviewsGoogle,
              
              // 🎯 Categorización mejorada
              barlive_types: barliveTypes,
              barlive_type: barliveType,
              tipos_google: details.types || [],
              
              // 💰 Nivel de precio
              nivel_precio_google: nivelPrecio,
              rango_precios: rangoPrecio,
              
              // 🔗 Enlaces importantes
              google_maps_url: googleMapsUrl,
              plus_code: plusCode,
              plus_code_compound: plusCodeCompound,
              
              // 🕐 Horarios completos
              horarios_completos: horariosCompletos,
              horarios_texto: horariosTexto,
              estado_actual: estadoActual,
              
              // 🏢 Estado del negocio
              google_business_status: details.business_status,
              
              // 📸 Fotos - AHORA DESDE SUPABASE
              fotos_google: fotosGoogle, // Metadatos de referencia
              imagen_url: imagenUrl, // URL de Supabase
              galeria_urls: galeriaUrls, // URLs de Supabase
              
              // 🍴 Cocina y música
              tipos_cocina: tiposCocina,
              musica_principal: musicaPrincipal,
              descripcion_google: details.editorial_summary?.overview,
              
              // 🍽️ Servicios disponibles completos
              servicios_disponibles: serviciosDisponibles,
              
              // 🎭 Ambiente completo
              ambiente_completo: ambienteCompleto,
              
              // 👥 Clientela
              clientela: clientela,
              
              // 💳 Métodos de pago completos
              metodos_pago_completos: metodosPagoCompletos,
              
              // 🧠 Análisis de reviews
              analisis_reviews: analisisReviews,
              
              // 📝 Otros datos
              google_place_id: details.place_id,
              google_price_level: details.price_level,
              descripcion: details.editorial_summary?.overview || details.name || local.nombre,
              
              // ✅ Marcar como enriquecido Y ACTIVAR
              enriquecido: true,
              activo: true,
              notas_rechazo: null,
              fecha_actualizacion: new Date().toISOString(),
            })
            .eq('id', local.id);
          
          // ✅ v130.0: DETECTAR ERROR DE DUPLICADO Y ELIMINAR AUTOMÁTICAMENTE
          if (updateError) {
            console.error('[Enrichment v130.0] ❌ Error updating local:', updateError);
            
            // Detectar error P0001 (duplicado en base de datos)
            if (updateError.code === 'P0001' || updateError.message.includes('already exists')) {
              agregarLog('error', `❌ DUPLICADO: ${local.nombre} - Ya existe en la base de datos`);
              agregarLog('info', `🗑️ Eliminando ${local.nombre} del catálogo para evitar costes...`);
              
              // EXCLUIR Y ELIMINAR local duplicado
              await excluirYEliminarLocalRechazado(
                local, 
                `Duplicado en base de datos: ${updateError.message}`
              );
              rechazados++;
              fallidos++;
            } else {
              agregarLog('error', `❌ Error al actualizar: ${local.nombre} - ${updateError.message}`);
              fallidos++;
            }
          } else {
            const rating = details.rating ? `⭐ ${details.rating}` : '';
            const reviews = details.user_ratings_total ? `(${details.user_ratings_total} reviews)` : '';
            const status = estadoActual === 'abierto_ahora' ? '🟢 Abierto' : estadoActual === 'cerrado_ahora' ? '🔴 Cerrado' : '';
            const price = rangoPrecio ? `💰 ${rangoPrecio}` : '';
            const types = barliveTypes.slice(0, 2).join(', ');
            const photos = galeriaUrls.length > 0 ? `📸 ${galeriaUrls.length} fotos` : '';
            agregarLog('success', `✅ ${local.nombre} ${rating} ${reviews} ${status} ${price} ${photos} [${types}]`);
            exitosos++;
            
            // 🔄 v2.0: MIGRACIÓN AUTOMÁTICA DE CATÁLOGO OSM A GOOGLE
            // Verificar si la migración automática está habilitada
            const autoCleanupEnabled = await estaLimpiezaAutomaticaHabilitada();
            if (autoCleanupEnabled) {
              agregarLog('info', `🔄 Migración automática: Moviendo ${local.nombre} al catálogo Google Places...`);
              const migrated = await limpiarLocalOSMSiEnriquecido(local.id);
              if (migrated) {
                agregarLog('success', `✅ ${local.nombre} migrado al catálogo Google Places (source_type: osm → google)`);
              } else {
                agregarLog('warning', `⚠️ No se pudo migrar ${local.nombre} al catálogo Google`);
              }
            }
          }
          
          performanceMonitor.end(`enrich_${local.id}`);
        } catch (error) {
          console.error('[Enrichment v130.0] ❌ Error enriching local:', error);
          agregarLog('error', `❌ Error: ${local.nombre} - ${error}`);
          fallidos++;
          
          // Si es un error de bucket, detener el proceso completo
          if (error instanceof Error && error.message.includes('Bucket')) {
            agregarLog('error', '❌ Deteniendo enriquecimiento por error de bucket');
            break;
          }
        }
        
        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 🔄 v2.0: MOSTRAR INFORMACIÓN SOBRE MIGRACIÓN AUTOMÁTICA
      const autoCleanupEnabled = await estaLimpiezaAutomaticaHabilitada();
      const cleanupMessage = autoCleanupEnabled
        ? '\n\n🔄 Migración automática: Los locales OSM enriquecidos han sido movidos al catálogo Google Places'
        : '\n\n💡 Tip: Activa la migración automática en "Separación de Catálogos" para mantener los catálogos organizados';
      
      // 📊 NUEVO: Mostrar estadísticas finales de API
      agregarLog('success', `🎉 Completado: ${exitosos} exitosos, ${fallidos} fallidos, ${rechazados} rechazados y eliminados`);
      agregarLog('info', '📊 ========== ESTADÍSTICAS DE API ==========');
      agregarLog('info', `📊 Total de llamadas: ${apiStats.totalCalls}`);
      agregarLog('info', `📊 Llamadas exitosas: ${apiStats.successfulCalls}`);
      agregarLog('info', `📊 Llamadas fallidas: ${apiStats.failedCalls}`);
      agregarLog('info', `📊 Errores de rate limit: ${apiStats.rateLimitErrors}`);
      agregarLog('info', `📊 Llamadas por minuto (promedio): ${apiStats.callsPerMinute}`);
      agregarLog('info', `📊 Tiempo de respuesta promedio: ${apiStats.averageResponseTime.toFixed(0)}ms`);
      agregarLog('info', '📊 ==========================================');
      
      if (autoCleanupEnabled) {
        agregarLog('info', `🔄 Migración automática: ${exitosos} locales movidos de catálogo OSM a Google Places`);
        agregarLog('info', '✅ Los locales siguen visibles en "Explorar" y "Mapa" con datos de Google Places');
      }
      
      // Determinar si hubo problemas de rate limit
      const rateLimitWarning = apiStats.rateLimitErrors > 0 
        ? `\n\n⚠️ Se detectaron ${apiStats.rateLimitErrors} errores de rate limit. Considera reducir la velocidad de procesamiento.`
        : '';
      
      Alert.alert(
        'Enriquecimiento Completado',
        `Se procesaron ${numLocales} locales.\n\n✅ Exitosos: ${exitosos}\n❌ Fallidos: ${fallidos}\n🗑️ Rechazados y eliminados: ${rechazados}\n\n📊 ESTADÍSTICAS DE API:\n• Total llamadas: ${apiStats.totalCalls}\n• Llamadas exitosas: ${apiStats.successfulCalls}\n• Errores rate limit: ${apiStats.rateLimitErrors}\n• Llamadas/min: ${apiStats.callsPerMinute}\n• Tiempo respuesta: ${apiStats.averageResponseTime.toFixed(0)}ms\n\n📸 Las fotos se han guardado en Supabase Storage\n🔍 Búsqueda multi-estrategia activada\n🗑️ Los locales rechazados y duplicados han sido eliminados del catálogo${cleanupMessage}${rateLimitWarning}`,
        [
          {
            text: 'Ver Estadísticas',
            onPress: () => {
              setPaso(2);
              cargarEstadisticas();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[Enrichment v130.0] ❌ Error en enriquecimiento:', error);
      agregarLog('error', 'Error durante el enriquecimiento');
      
      if (error instanceof Error && error.message.includes('Bucket')) {
        Alert.alert(
          'Error de Configuración',
          'El bucket "locales" no existe en Supabase Storage.\n\n' +
          'Por favor, crea el bucket siguiendo la guía en:\ndocs/SUPABASE_STORAGE_SETUP.md',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Ocurrió un error durante el enriquecimiento');
      }
    } finally {
      setProcesando(false);
      performanceMonitor.end('procesarEnriquecimiento');
      performanceMonitor.logReport();
    }
  };

  const seleccionarComunidad = (comunidad: string) => {
    setComunidadSeleccionada(comunidad);
    setProvinciaSeleccionada(COMUNIDADES_PROVINCIAS[comunidad][0]);
    setMostrarSelectorComunidad(false);
  };

  const seleccionarProvincia = (provincia: string) => {
    setProvinciaSeleccionada(provincia);
    setMostrarSelectorProvincia(false);
  };

  const renderPaso1 = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(20) }]}>1. Seleccionar Zona y Categoría</Text>
      
      <View style={styles.card}>
        <Text style={[styles.label, { fontSize: scaleFontSize(16) }]}>Comunidad Autónoma</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setMostrarSelectorComunidad(true)}
        >
          <Text style={[styles.selectorButtonText, { fontSize: scaleFontSize(16) }]}>{comunidadSeleccionada}</Text>
          <IconSymbol 
            ios_icon_name="chevron.down" 
            android_material_icon_name="expand_more" 
            size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 20, fontSize: scaleFontSize(16) }]}>Provincia</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setMostrarSelectorProvincia(true)}
        >
          <Text style={[styles.selectorButtonText, { fontSize: scaleFontSize(16) }]}>{provinciaSeleccionada}</Text>
          <IconSymbol 
            ios_icon_name="chevron.down" 
            android_material_icon_name="expand_more" 
            size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, { marginTop: 20 }]}
          onPress={() => setPaso(2)}
        >
          <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>Continuar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={sincronizarCatalogo}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>Sincronizar Catálogo</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPaso2 = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(20) }]}>2. Seleccionar Categoría</Text>
      <Text style={[styles.subtitle, { fontSize: scaleFontSize(16) }]}>{provinciaSeleccionada}</Text>

      <View style={[styles.card, { marginBottom: 15 }]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { fontSize: scaleFontSize(16) }]}>Re-enriquecer locales activos</Text>
            <Text style={[styles.switchSubLabel, { fontSize: scaleFontSize(13) }]}>Actualizar datos de locales ya enriquecidos</Text>
          </View>
          <Switch
            value={reEnriquecer}
            onValueChange={setReEnriquecer}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="white"
          />
        </View>
      </View>

      {/* Estadísticas generales */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontSize: scaleFontSize(24) }]}>{estadisticas.totalOSM}</Text>
            <Text style={[styles.statLabel, { fontSize: scaleFontSize(12) }]}>Total OSM</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981', fontSize: scaleFontSize(24) }]}>{estadisticas.enriquecidos}</Text>
            <Text style={[styles.statLabel, { fontSize: scaleFontSize(12) }]}>Enriquecidos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444', fontSize: scaleFontSize(24) }]}>{estadisticas.rechazados}</Text>
            <Text style={[styles.statLabel, { fontSize: scaleFontSize(12) }]}>Rechazados</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B', fontSize: scaleFontSize(24) }]}>{estadisticas.pendientes}</Text>
            <Text style={[styles.statLabel, { fontSize: scaleFontSize(12) }]}>Pendientes</Text>
          </View>
        </View>
        <Text style={[styles.progressLabel, { fontSize: scaleFontSize(14) }]}>
          Progreso general: {estadisticas.totalOSM > 0 ? ((estadisticas.enriquecidos / estadisticas.totalOSM) * 100).toFixed(1) : 0}%
        </Text>
      </View>

      {/* Info box explaining the system */}
      {estadisticas.totalOSM > 0 && (
        <View style={[styles.infoBox, { backgroundColor: '#D1FAE5', marginBottom: 15 }]}>
          <Text style={[styles.infoBoxTitle, { color: '#065F46', fontSize: scaleFontSize(13) }]}>✅ Sistema de Enriquecimiento v130.0</Text>
          <Text style={[styles.infoBoxText, { color: '#065F46', fontSize: scaleFontSize(12) }]}>
            <Text style={{ fontWeight: 'bold' }}>Total:</Text> TODOS los locales en la categoría (todas las fuentes)
          </Text>
          <Text style={[styles.infoBoxText, { color: '#065F46', marginTop: 5, fontSize: scaleFontSize(12) }]}>
            <Text style={{ fontWeight: 'bold' }}>Enriquecidos:</Text> TODOS los locales ACTIVOS (todas las fuentes)
          </Text>
          <Text style={[styles.infoBoxText, { color: '#065F46', marginTop: 5, fontSize: scaleFontSize(12) }]}>
            <Text style={{ fontWeight: 'bold' }}>Pendientes:</Text> Locales OSM INACTIVOS sin notas de rechazo
          </Text>
          <Text style={[styles.infoBoxText, { color: '#065F46', marginTop: 5, fontSize: scaleFontSize(12) }]}>
            <Text style={{ fontWeight: 'bold' }}>Rechazados:</Text> Locales INACTIVOS con notas de rechazo
          </Text>
          <Text style={[styles.infoBoxText, { color: '#065F46', marginTop: 8, fontSize: scaleFontSize(12) }]}>
            🗑️ Los locales rechazados o duplicados se eliminan automáticamente
          </Text>
        </View>
      )}

      {estadisticas.totalOSM === 0 && (
        <View style={[styles.infoBox, { backgroundColor: '#FEF3C7', marginBottom: 15 }]}>
          <Text style={[styles.infoBoxTitle, { color: '#92400E', fontSize: scaleFontSize(13) }]}>⚠️ Sin locales importados</Text>
          <Text style={[styles.infoBoxText, { color: '#92400E', fontSize: scaleFontSize(12) }]}>
            No hay locales importados de OSM en {provinciaSeleccionada}.
          </Text>
          <Text style={[styles.infoBoxText, { color: '#92400E', marginTop: 5, fontSize: scaleFontSize(12) }]}>
            Debes ir primero a &quot;Importación OSM&quot; para importar locales antes de poder enriquecerlos.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, { marginTop: 10 }]}
            onPress={() => router.push('/admin/importacion-osm')}
          >
            <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>Ir a Importación OSM</Text>
          </TouchableOpacity>
          
          <View style={[styles.infoBox, { backgroundColor: '#DBEAFE', marginTop: 15 }]}>
            <Text style={[styles.infoBoxTitle, { color: '#1E40AF', fontSize: scaleFontSize(13) }]}>💡 Información</Text>
            <Text style={[styles.infoBoxText, { color: '#1E40AF', fontSize: scaleFontSize(12) }]}>
              El catálogo de importación OSM contiene los locales que has importado desde OpenStreetMap.
            </Text>
            <Text style={[styles.infoBoxText, { color: '#1E40AF', marginTop: 5, fontSize: scaleFontSize(12) }]}>
              Una vez importados, aparecerán aquí para que puedas enriquecerlos con datos de Google Places.
            </Text>
          </View>
        </View>
      )}

      {/* Categorías */}
      <View style={styles.categoriasGrid}>
        {estadisticasCategorias.map(cat => (
          <TouchableOpacity
            key={cat.categoria}
            style={styles.categoriaCard}
            onPress={() => seleccionarCategoria(cat.categoria)}
            disabled={cat.total === 0}
          >
            <Text style={[styles.categoriaEmoji, { fontSize: scaleFontSize(32) }]}>{cat.emoji}</Text>
            <Text style={[styles.categoriaNombre, { fontSize: scaleFontSize(16) }]}>{cat.categoria}</Text>
            <Text style={[styles.categoriaStats, { fontSize: scaleFontSize(11) }]}>Total</Text>
            <Text style={[styles.categoriaTotal, { fontSize: scaleFontSize(20) }]}>{cat.total}</Text>
            
            <View style={styles.categoriaDetailsContainer}>
              <View style={styles.categoriaDetailRow}>
                <Text style={[styles.categoriaDetailLabel, { fontSize: scaleFontSize(10) }]}>Enriquecidos:</Text>
                <Text style={[styles.categoriaDetailValue, { color: '#10B981', fontSize: scaleFontSize(12) }]}>
                  {cat.enriquecidos}
                </Text>
              </View>
              <View style={styles.categoriaDetailRow}>
                <Text style={[styles.categoriaDetailLabel, { fontSize: scaleFontSize(10) }]}>Pendientes:</Text>
                <Text style={[styles.categoriaDetailValue, { color: '#F59E0B', fontSize: scaleFontSize(12) }]}>
                  {cat.pendientes}
                </Text>
              </View>
              {cat.rechazados > 0 && (
                <View style={styles.categoriaDetailRow}>
                  <Text style={[styles.categoriaDetailLabel, { fontSize: scaleFontSize(10) }]}>Rechazados:</Text>
                  <Text style={[styles.categoriaDetailValue, { color: '#EF4444', fontSize: scaleFontSize(12) }]}>
                    {cat.rechazados}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPaso3 = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(20) }]}>3. Configurar Enriquecimiento</Text>
      <Text style={[styles.subtitle, { fontSize: scaleFontSize(16) }]}>{categoriaSeleccionada}</Text>

      {/* Warning about excluded locales */}
      <View style={[styles.infoBox, { backgroundColor: '#FEE2E2', marginBottom: 15 }]}>
        <Text style={[styles.infoBoxTitle, { color: '#991B1B', fontSize: scaleFontSize(13) }]}>🗑️ Eliminación Automática v130.0</Text>
        <Text style={[styles.infoBoxText, { color: '#991B1B', marginTop: 5, fontSize: scaleFontSize(12) }]}>
          Los locales rechazados o duplicados serán:
          {'\n\n'}
          ✅ Agregados a la tabla de exclusión
          {'\n'}
          ✅ Eliminados del catálogo de locales
          {'\n'}
          ✅ Bloqueados para futuras importaciones
          {'\n\n'}
          Esto evita costes innecesarios de API y mantiene el catálogo limpio.
        </Text>
      </View>

      {/* NEW v2.0: Catalog Migration Info */}
      <View style={[styles.infoBox, { backgroundColor: '#D1FAE5', marginBottom: 15 }]}>
        <Text style={[styles.infoBoxTitle, { color: '#065F46', fontSize: scaleFontSize(13) }]}>🔄 Separación de Catálogos v2.0</Text>
        <Text style={[styles.infoBoxText, { color: '#065F46', marginTop: 5, fontSize: scaleFontSize(12) }]}>
          Los locales OSM enriquecidos exitosamente serán:
          {'\n\n'}
          ✅ Migrados al catálogo Google Places (source_type: osm → google)
          {'\n'}
          ✅ Mantenidos visibles en "Explorar" y "Mapa" con todos sus datos
          {'\n'}
          ✅ Separados del catálogo OSM para mejor organización
          {'\n\n'}
          💡 Configura la migración automática en "Separación de Catálogos"
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.infoText, { fontSize: scaleFontSize(14) }]}>
          Quedan {localesPendientes} locales pendientes de enriquecer
        </Text>
        <Text style={[styles.infoText, { fontSize: scaleFontSize(12), color: colors.textSecondary, marginTop: 5 }]}>
          {localesAEnriquecer.length} locales cargados en memoria
        </Text>

        <Text style={[styles.label, { marginTop: 20, fontSize: scaleFontSize(16) }]}>Locales por lote</Text>
        <TextInput
          style={[styles.input, { fontSize: scaleFontSize(16) }]}
          value={localesPorLote.toString()}
          onChangeText={text => setLocalesPorLote(parseInt(text) || 0)}
          keyboardType="number-pad"
          placeholder="25"
        />

        <View style={[styles.infoBox, { marginTop: 15, backgroundColor: '#DBEAFE' }]}>
          <Text style={[styles.infoBoxTitle, { color: '#1E40AF', fontSize: scaleFontSize(13) }]}>🔍 Búsqueda Mejorada Multi-Estrategia</Text>
          <Text style={[styles.infoBoxText, { color: '#1E40AF', marginTop: 5, fontSize: scaleFontSize(12) }]}>
            Se utilizan 5 estrategias de búsqueda:{'\n\n'}
            1️⃣ Nombre + Ciudad + Provincia{'\n'}
            2️⃣ Búsqueda por proximidad con tipo (100m){'\n'}
            3️⃣ Nombre + Provincia{'\n'}
            4️⃣ Tipo + Nombre + Provincia{'\n'}
            5️⃣ Búsqueda por proximidad amplia (150m){'\n\n'}
            Esto maximiza la tasa de éxito para encontrar locales.
          </Text>
        </View>

        <View style={[styles.infoBox, { marginTop: 10, backgroundColor: '#D1FAE5' }]}>
          <Text style={[styles.infoBoxTitle, { color: '#065F46', fontSize: scaleFontSize(13) }]}>✅ Sistema de Validación Inteligente</Text>
          <Text style={[styles.infoBoxText, { color: '#065F46', marginTop: 5, fontSize: scaleFontSize(12) }]}>
            Validación mejorada:{'\n\n'}
            ✅ Análisis de nombre (detecta discotecas por nombre){'\n'}
            ✅ Tipos válidos priorizados sobre prohibidos{'\n'}
            ✅ Business status (solo OPERATIONAL){'\n'}
            ✅ Ubicación en España{'\n'}
            ✅ Validación de horarios por categoría{'\n\n'}
            Los locales rechazados se eliminarán automáticamente.
          </Text>
        </View>

        <View style={[styles.infoBox, { marginTop: 10, backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.infoBoxTitle, { color: '#92400E', fontSize: scaleFontSize(13) }]}>💰 Estimación de Coste</Text>
          <Text style={[styles.infoBoxText, { color: '#92400E', fontSize: scaleFontSize(12) }]}>
            ${calcularCosteEstimado(Math.min(localesPorLote, localesPendientes, localesAEnriquecer.length))} en Google Places API
          </Text>
          <Text style={[styles.infoBoxText, { color: '#92400E', fontSize: scaleFontSize(11), marginTop: 3 }]}>
            (2 llamadas por local: búsqueda + detalles + hasta 4 fotos)
          </Text>
        </View>

        <View style={[styles.infoBox, { marginTop: 10, backgroundColor: '#E0E7FF' }]}>
          <Text style={[styles.infoBoxTitle, { color: '#3730A3', fontSize: scaleFontSize(13) }]}>📸 Almacenamiento de Fotos</Text>
          <Text style={[styles.infoBoxText, { color: '#3730A3', fontSize: scaleFontSize(12) }]}>
            Las fotos se descargarán de Google Places y se subirán a Supabase Storage.{'\n\n'}
            ✅ Evita llamadas continuas a la API de Google{'\n'}
            ✅ Las fotos se almacenan en tu propia base de datos{'\n'}
            ✅ Mayor control y rendimiento
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, { marginTop: 20 }]}
          onPress={iniciarEnriquecimiento}
          disabled={procesando || localesPendientes === 0 || localesAEnriquecer.length === 0}
        >
          {procesando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>
              Enriquecer {Math.min(localesPorLote, localesPendientes, localesAEnriquecer.length)} Locales
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Progreso */}
      {procesando && (
        <View style={styles.progressCard}>
          <Text style={[styles.progressTitle, { fontSize: scaleFontSize(16) }]}>
            Procesando {progreso.actual} de {progreso.total}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(progreso.actual / progreso.total) * 100}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressPercentage, { fontSize: scaleFontSize(14) }]}>
            {((progreso.actual / progreso.total) * 100).toFixed(0)}%
          </Text>
        </View>
      )}

      {/* 📊 NUEVO: Estadísticas de API en tiempo real */}
      {(procesando || apiStats.totalCalls > 0) && (
        <View style={styles.apiStatsCard}>
          <View style={styles.apiStatsHeader}>
            <Text style={[styles.apiStatsTitle, { fontSize: scaleFontSize(16) }]}>
              📊 Monitoreo de API en Tiempo Real
            </Text>
            {!procesando && (
              <TouchableOpacity
                style={styles.resetStatsButton}
                onPress={resetearEstadisticasAPI}
              >
                <IconSymbol 
                  ios_icon_name="arrow.clockwise" 
                  android_material_icon_name="refresh" 
                  size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Indicador de rate limit */}
          {apiStats.rateLimitErrors > 0 && (
            <View style={[styles.rateLimitWarning, { backgroundColor: '#FEE2E2' }]}>
              <IconSymbol 
                ios_icon_name="exclamationmark.triangle.fill" 
                android_material_icon_name="warning" 
                size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                color="#DC2626" 
              />
              <Text style={[styles.rateLimitWarningText, { fontSize: scaleFontSize(13) }]}>
                ⚠️ {apiStats.rateLimitErrors} errores de rate limit detectados
              </Text>
            </View>
          )}

          {/* Indicador de velocidad */}
          {apiStats.callsPerMinute > 50 && (
            <View style={[styles.speedWarning, { backgroundColor: '#FEF3C7' }]}>
              <IconSymbol 
                ios_icon_name="speedometer" 
                android_material_icon_name="speed" 
                size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                color="#D97706" 
              />
              <Text style={[styles.speedWarningText, { fontSize: scaleFontSize(13) }]}>
                ⚡ Alta velocidad: {apiStats.callsPerMinute} llamadas/min
              </Text>
            </View>
          )}

          <View style={styles.apiStatsGrid}>
            <View style={styles.apiStatItem}>
              <Text style={[styles.apiStatValue, { fontSize: scaleFontSize(24), color: colors.primary }]}>
                {apiStats.totalCalls}
              </Text>
              <Text style={[styles.apiStatLabel, { fontSize: scaleFontSize(11) }]}>
                Total Llamadas
              </Text>
            </View>

            <View style={styles.apiStatItem}>
              <Text style={[styles.apiStatValue, { fontSize: scaleFontSize(24), color: '#10B981' }]}>
                {apiStats.successfulCalls}
              </Text>
              <Text style={[styles.apiStatLabel, { fontSize: scaleFontSize(11) }]}>
                Exitosas
              </Text>
            </View>

            <View style={styles.apiStatItem}>
              <Text style={[styles.apiStatValue, { fontSize: scaleFontSize(24), color: '#EF4444' }]}>
                {apiStats.failedCalls}
              </Text>
              <Text style={[styles.apiStatLabel, { fontSize: scaleFontSize(11) }]}>
                Fallidas
              </Text>
            </View>

            <View style={styles.apiStatItem}>
              <Text style={[styles.apiStatValue, { fontSize: scaleFontSize(24), color: '#F59E0B' }]}>
                {apiStats.rateLimitErrors}
              </Text>
              <Text style={[styles.apiStatLabel, { fontSize: scaleFontSize(11) }]}>
                Rate Limits
              </Text>
            </View>
          </View>

          <View style={styles.apiStatsDetails}>
            <View style={styles.apiStatDetailRow}>
              <Text style={[styles.apiStatDetailLabel, { fontSize: scaleFontSize(12) }]}>
                Llamadas por minuto:
              </Text>
              <Text style={[styles.apiStatDetailValue, { fontSize: scaleFontSize(12) }]}>
                {apiStats.callsPerMinute}
              </Text>
            </View>

            <View style={styles.apiStatDetailRow}>
              <Text style={[styles.apiStatDetailLabel, { fontSize: scaleFontSize(12) }]}>
                Tiempo respuesta promedio:
              </Text>
              <Text style={[styles.apiStatDetailValue, { fontSize: scaleFontSize(12) }]}>
                {apiStats.averageResponseTime.toFixed(0)}ms
              </Text>
            </View>

            {apiStats.lastCallTimestamp && (
              <View style={styles.apiStatDetailRow}>
                <Text style={[styles.apiStatDetailLabel, { fontSize: scaleFontSize(12) }]}>
                  Última llamada:
                </Text>
                <Text style={[styles.apiStatDetailValue, { fontSize: scaleFontSize(12) }]}>
                  {apiStats.lastCallTimestamp.toLocaleTimeString()}
                </Text>
              </View>
            )}

            {/* Tasa de éxito */}
            <View style={styles.apiStatDetailRow}>
              <Text style={[styles.apiStatDetailLabel, { fontSize: scaleFontSize(12) }]}>
                Tasa de éxito:
              </Text>
              <Text style={[styles.apiStatDetailValue, { fontSize: scaleFontSize(12), color: '#10B981' }]}>
                {apiStats.totalCalls > 0 
                  ? ((apiStats.successfulCalls / apiStats.totalCalls) * 100).toFixed(1)
                  : 0}%
              </Text>
            </View>
          </View>

          {/* Información sobre límites de Google Places */}
          <View style={[styles.infoBox, { marginTop: 10, backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.infoBoxTitle, { color: '#1E40AF', fontSize: scaleFontSize(12) }]}>
              ℹ️ Límites de Google Places API
            </Text>
            <Text style={[styles.infoBoxText, { color: '#1E40AF', fontSize: scaleFontSize(11) }]}>
              • Límite estándar: 100 llamadas/segundo{'\n'}
              • Límite diario: Según tu plan de facturación{'\n'}
              • El sistema pausa automáticamente si detecta rate limit (429)
            </Text>
          </View>
        </View>
      )}

      {/* Logs en tiempo real */}
      {logs.length > 0 && (
        <View style={styles.logsCard}>
          <View style={styles.logsHeader}>
            <Text style={[styles.logsTitle, { fontSize: scaleFontSize(16) }]}>📡 Logs en Tiempo Real</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={copiarLogs}
            >
              <IconSymbol 
                ios_icon_name="doc.on.doc" 
                android_material_icon_name="content_copy" 
                size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                color={colors.primary} 
              />
              <Text style={[styles.copyButtonText, { fontSize: scaleFontSize(14) }]}>Copiar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.logsContainer} nestedScrollEnabled>
            {logs.map((log, index) => (
              <View key={index} style={styles.logEntry}>
                <Text style={[styles.logTimestamp, { color: getLogColor(log.tipo), fontSize: scaleFontSize(11) }]}>
                  [{log.timestamp}]
                </Text>
                <Text style={[styles.logMessage, { color: getLogColor(log.tipo), fontSize: scaleFontSize(11) }]}>
                  {log.mensaje}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const getLogColor = (tipo: LogEntry['tipo']) => {
    switch (tipo) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      default:
        return colors.text;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow_back" 
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
            color="white" 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Enriquecimiento con Google Places</Text>
        <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(14) }]}>
          v131.0 - Monitoreo de API y detección de límites
        </Text>
      </LinearGradient>

      {/* Indicador de pasos */}
      <View style={styles.stepsIndicator}>
        {[1, 2, 3].map(step => (
          <View key={step} style={styles.stepContainer}>
            <View
              style={[
                styles.stepCircle,
                paso >= step && styles.stepCircleActive,
                paso > step && styles.stepCircleCompleted,
              ]}
            >
              {paso > step ? (
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={Platform.OS === 'android' ? scaleIconSize(16) : 16} 
                  color="white" 
                />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    { fontSize: scaleFontSize(16) },
                    paso >= step && styles.stepNumberActive,
                  ]}
                >
                  {step}
                </Text>
              )}
            </View>
            {step < 3 && (
              <View
                style={[
                  styles.stepLine,
                  paso > step && styles.stepLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {paso === 1 && renderPaso1()}
        {paso === 2 && renderPaso2()}
        {paso === 3 && renderPaso3()}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal selector de comunidad */}
      <Modal
        visible={mostrarSelectorComunidad}
        transparent
        animationType="slide"
        onRequestClose={() => setMostrarSelectorComunidad(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(18) }]}>Seleccionar Comunidad Autónoma</Text>
              <TouchableOpacity onPress={() => setMostrarSelectorComunidad(false)}>
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {Object.keys(COMUNIDADES_PROVINCIAS).map(comunidad => (
                <TouchableOpacity
                  key={comunidad}
                  style={[
                    styles.modalItem,
                    comunidadSeleccionada === comunidad && styles.modalItemSelected,
                  ]}
                  onPress={() => seleccionarComunidad(comunidad)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      { fontSize: scaleFontSize(16) },
                      comunidadSeleccionada === comunidad && styles.modalItemTextSelected,
                    ]}
                  >
                    {comunidad}
                  </Text>
                  {comunidadSeleccionada === comunidad && (
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                      color={colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal selector de provincia */}
      <Modal
        visible={mostrarSelectorProvincia}
        transparent
        animationType="slide"
        onRequestClose={() => setMostrarSelectorProvincia(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(18) }]}>Seleccionar Provincia</Text>
              <TouchableOpacity onPress={() => setMostrarSelectorProvincia(false)}>
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {COMUNIDADES_PROVINCIAS[comunidadSeleccionada].map(provincia => (
                <TouchableOpacity
                  key={provincia}
                  style={[
                    styles.modalItem,
                    provinciaSeleccionada === provincia && styles.modalItemSelected,
                  ]}
                  onPress={() => seleccionarProvincia(provincia)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      { fontSize: scaleFontSize(16) },
                      provinciaSeleccionada === provincia && styles.modalItemTextSelected,
                    ]}
                  >
                    {provincia}
                  </Text>
                  {provinciaSeleccionada === provincia && (
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                      color={colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  stepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  label: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  selectorButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontWeight: '600',
    color: colors.text,
  },
  switchSubLabel: {
    color: colors.textSecondary,
    marginTop: 3,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: 5,
  },
  progressLabel: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  categoriasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoriaCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    ...commonStyles.shadow,
  },
  categoriaEmoji: {
    marginBottom: 8,
  },
  categoriaNombre: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  categoriaStats: {
    color: colors.textSecondary,
    marginBottom: 3,
  },
  categoriaTotal: {
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  categoriaDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  categoriaDetail: {
    fontWeight: '600',
    color: '#10B981',
    marginHorizontal: 3,
  },
  categoriaDetailsContainer: {
    width: '100%',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoriaDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoriaDetailLabel: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoriaDetailValue: {
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
  },
  infoBoxTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  infoBoxText: {
    color: colors.textSecondary,
    marginTop: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    backgroundColor: 'white',
  },
  infoText: {
    color: colors.text,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    ...commonStyles.shadow,
  },
  progressTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressPercentage: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  logsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    ...commonStyles.shadow,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logsTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 5,
  },
  logsContainer: {
    maxHeight: 300,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  logTimestamp: {
    fontWeight: '600',
    marginRight: 8,
  },
  logMessage: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemSelected: {
    backgroundColor: colors.background,
  },
  modalItemText: {
    color: colors.text,
  },
  modalItemTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  // 📊 NUEVO: Estilos para estadísticas de API
  apiStatsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    ...commonStyles.shadow,
  },
  apiStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  apiStatsTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  resetStatsButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  rateLimitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  rateLimitWarningText: {
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  speedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  speedWarningText: {
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 8,
    flex: 1,
  },
  apiStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  apiStatItem: {
    alignItems: 'center',
  },
  apiStatValue: {
    fontWeight: 'bold',
  },
  apiStatLabel: {
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  apiStatsDetails: {
    marginTop: 10,
  },
  apiStatDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  apiStatDetailLabel: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  apiStatDetailValue: {
    fontWeight: '700',
    color: colors.text,
  },
});
