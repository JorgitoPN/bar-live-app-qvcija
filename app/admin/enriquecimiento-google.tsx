
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { googlePlacesTextSearch, googlePlacesDetails } from '@/utils/googlePlacesApi';
import { mapGoogleTypesToBarlive, categorizarPorHorarios, mapearNivelPrecio } from '@/utils/enrichmentMapping';
import { validarLocalCompleto, estaEnEspana } from '@/utils/localTypesBackend';
import * as Clipboard from 'expo-clipboard';
import { dataCache } from '@/utils/dataCache';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { descargarYSubirFotosLocal, generarMetadatosFotos } from '@/utils/enrichmentPhotos';

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

export default function EnriquecimientoGoogleScreen() {
  const router = useRouter();
  
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

  const agregarLog = useCallback((tipo: LogEntry['tipo'], mensaje: string) => {
    const nuevoLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      tipo,
      mensaje,
    };
    setLogs(prev => [nuevoLog, ...prev].slice(0, MAX_LOGS));
  }, []);

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
      // Check cache first
      const cacheKey = `stats_${provinciaSeleccionada}`;
      const cachedStats = dataCache.get<any>(cacheKey);
      
      if (cachedStats) {
        console.log('[Cache] Using cached statistics');
        setEstadisticas(cachedStats.estadisticas);
        setEstadisticasCategorias(cachedStats.estadisticasCategorias);
        agregarLog('success', 'Estadísticas cargadas desde caché');
        setCargando(false);
        performanceMonitor.end('cargarEstadisticas');
        return;
      }

      // Obtener estadísticas generales de la provincia
      const { data: statsData, error: statsError } = await supabase
        .from('locales')
        .select('source_type, enriquecido, tipo')
        .eq('provincia', provinciaSeleccionada);

      if (statsError) {
        console.error('Error loading stats:', statsError);
        agregarLog('error', 'Error al cargar estadísticas');
        performanceMonitor.end('cargarEstadisticas');
        return;
      }

      console.log('[Enrichment] Stats data:', statsData?.length || 0, 'locales');

      const totalOSM = statsData?.filter(l => l.source_type === 'osm').length || 0;
      const enriquecidos = statsData?.filter(l => l.enriquecido === true).length || 0;
      const pendientes = statsData?.filter(l => l.source_type === 'osm' && l.enriquecido === false).length || 0;
      const rechazados = 0;

      const newEstadisticas = {
        totalOSM,
        enriquecidos,
        rechazados,
        pendientes,
      };

      setEstadisticas(newEstadisticas);

      // Estadísticas por categoría
      const statsCategorias: EstadisticasCategoria[] = CATEGORIAS.map(cat => {
        const localesCategoria = statsData?.filter(l => l.tipo === cat.id) || [];
        const total = localesCategoria.length;
        const enriquecidosCategoria = localesCategoria.filter(l => l.enriquecido === true).length;
        const pendientesCategoria = localesCategoria.filter(l => l.source_type === 'osm' && l.enriquecido === false).length;

        return {
          categoria: cat.nombre,
          emoji: cat.emoji,
          total,
          enriquecidos: enriquecidosCategoria,
          pendientes: pendientesCategoria,
          rechazados: 0,
        };
      });

      setEstadisticasCategorias(statsCategorias);
      
      // Cache the results
      dataCache.set(cacheKey, {
        estadisticas: newEstadisticas,
        estadisticasCategorias: statsCategorias,
      }, 2 * 60 * 1000);
      
      if (totalOSM === 0) {
        agregarLog('warning', `⚠️ No hay locales importados de OSM en ${provinciaSeleccionada}`);
        agregarLog('info', 'Ve a "Importación OSM" para importar locales primero');
      } else {
        agregarLog('success', `Estadísticas cargadas: ${totalOSM} locales OSM, ${enriquecidos} enriquecidos, ${pendientes} pendientes`);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      agregarLog('error', 'Error al cargar estadísticas');
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
              // Clear cache to force refresh
              dataCache.clear(`stats_${provinciaSeleccionada}`);
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
      
      try {
        const categoriaId = CATEGORIAS.find(c => c.nombre === categoria)?.id || 'bar';
        
        const query = supabase
          .from('locales')
          .select('id, nombre, direccion, tipo, provincia, latitud, longitud')
          .eq('provincia', provinciaSeleccionada)
          .eq('tipo', categoriaId)
          .eq('source_type', 'osm')
          .limit(100);
        
        if (!reEnriquecer) {
          query.eq('enriquecido', false);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Error loading locales:', error);
          agregarLog('error', 'Error al cargar locales');
          setLocalesAEnriquecer([]);
        } else {
          setLocalesAEnriquecer(data || []);
          agregarLog('success', `${data?.length || 0} locales cargados para enriquecer`);
        }
      } catch (error) {
        console.error('Error:', error);
        agregarLog('error', 'Error al cargar locales');
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

  const iniciarEnriquecimiento = async () => {
    const localesAProcesar = Math.min(localesPorLote, localesPendientes, localesAEnriquecer.length);
    
    if (localesAProcesar === 0) {
      Alert.alert('Sin locales', 'No hay locales pendientes de enriquecer');
      return;
    }

    const coste = calcularCosteEstimado(localesAProcesar);
    
    Alert.alert(
      'Confirmar Enriquecimiento',
      `Se procesarán ${localesAProcesar} locales de la categoría "${categoriaSeleccionada}".\n\n📸 Las fotos se descargarán de Google Places y se subirán a Supabase Storage.\n\nCoste estimado: $${coste}\n\n¿Continuar?`,
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
    agregarLog('info', `🚀 Iniciando enriquecimiento de ${numLocales} locales...`);
    agregarLog('info', '📸 Las fotos se descargarán y subirán a Supabase Storage');

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
          
          // 🔍 PASO 1: Buscar en Google Places
          const query = `${local.nombre} ${local.direccion}`;
          const placeResult = await googlePlacesTextSearch(query);
          
          if (!placeResult || !placeResult.place_id) {
            agregarLog('warning', `⚠️ No encontrado en Google: ${local.nombre}`);
            fallidos++;
            performanceMonitor.end(`enrich_${local.id}`);
            continue;
          }
          
          // 🔍 PASO 2: Obtener detalles completos
          const details = await googlePlacesDetails(placeResult.place_id, [
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
          
          if (!details) {
            agregarLog('warning', `⚠️ Sin detalles: ${local.nombre}`);
            fallidos++;
            performanceMonitor.end(`enrich_${local.id}`);
            continue;
          }
          
          // ✅ PASO 3: VALIDAR LOCAL CON SISTEMA DE DISCRIMINACIÓN
          agregarLog('info', `🔍 Validando: ${local.nombre}...`);
          const validacionCompleta = validarLocalCompleto(details);
          
          if (!validacionCompleta.valido) {
            agregarLog('error', `❌ RECHAZADO: ${local.nombre} - ${validacionCompleta.razon}`);
            rechazados++;
            
            // Marcar como rechazado en la base de datos (INACTIVO)
            await supabase
              .from('locales')
              .update({
                enriquecido: false,
                activo: false,
                notas_rechazo: validacionCompleta.razon,
                fecha_actualizacion: new Date().toISOString(),
              })
              .eq('id', local.id);
            
            performanceMonitor.end(`enrich_${local.id}`);
            continue;
          }
          
          // ✅ PASO 4: VALIDAR UBICACIÓN (España)
          const enEspana = estaEnEspana(
            details.formatted_address,
            details.plus_code?.global_code
          );
          
          if (!enEspana) {
            agregarLog('error', `❌ RECHAZADO: ${local.nombre} - Fuera de España`);
            rechazados++;
            
            await supabase
              .from('locales')
              .update({
                enriquecido: false,
                activo: false,
                notas_rechazo: 'Fuera de España',
                fecha_actualizacion: new Date().toISOString(),
              })
              .eq('id', local.id);
            
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
          
          if (updateError) {
            console.error('Error updating local:', updateError);
            agregarLog('error', `❌ Error al actualizar: ${local.nombre}`);
            fallidos++;
          } else {
            const rating = details.rating ? `⭐ ${details.rating}` : '';
            const reviews = details.user_ratings_total ? `(${details.user_ratings_total} reviews)` : '';
            const status = estadoActual === 'abierto_ahora' ? '🟢 Abierto' : estadoActual === 'cerrado_ahora' ? '🔴 Cerrado' : '';
            const price = rangoPrecio ? `💰 ${rangoPrecio}` : '';
            const types = barliveTypes.slice(0, 2).join(', ');
            const photos = galeriaUrls.length > 0 ? `📸 ${galeriaUrls.length} fotos` : '';
            agregarLog('success', `✅ ${local.nombre} ${rating} ${reviews} ${status} ${price} ${photos} [${types}]`);
            exitosos++;
          }
          
          performanceMonitor.end(`enrich_${local.id}`);
        } catch (error) {
          console.error('Error enriching local:', error);
          agregarLog('error', `❌ Error: ${local.nombre} - ${error}`);
          fallidos++;
        }
        
        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      agregarLog('success', `🎉 Completado: ${exitosos} exitosos, ${fallidos} fallidos, ${rechazados} rechazados`);
      
      // Clear cache to force refresh of statistics
      dataCache.clear(`stats_${provinciaSeleccionada}`);
      
      Alert.alert(
        'Enriquecimiento Completado',
        `Se procesaron ${numLocales} locales.\n\n✅ Exitosos: ${exitosos}\n❌ Fallidos: ${fallidos}\n🚫 Rechazados: ${rechazados}\n\n📸 Las fotos se han guardado en Supabase Storage`,
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
      console.error('Error en enriquecimiento:', error);
      agregarLog('error', 'Error durante el enriquecimiento');
      Alert.alert('Error', 'Ocurrió un error durante el enriquecimiento');
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
    // Clear cache when changing location
    dataCache.clearAll();
  };

  const seleccionarProvincia = (provincia: string) => {
    setProvinciaSeleccionada(provincia);
    setMostrarSelectorProvincia(false);
    // Clear cache when changing location
    dataCache.clearAll();
  };

  const renderPaso1 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>1. Seleccionar Zona y Categoría</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Comunidad Autónoma</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setMostrarSelectorComunidad(true)}
        >
          <Text style={styles.selectorButtonText}>{comunidadSeleccionada}</Text>
          <IconSymbol name="chevron.down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 20 }]}>Provincia</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setMostrarSelectorProvincia(true)}
        >
          <Text style={styles.selectorButtonText}>{provinciaSeleccionada}</Text>
          <IconSymbol name="chevron.down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, { marginTop: 20 }]}
          onPress={() => setPaso(2)}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={sincronizarCatalogo}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Sincronizar Catálogo</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPaso2 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>2. Seleccionar Categoría</Text>
      <Text style={styles.subtitle}>{provinciaSeleccionada}</Text>

      <View style={[styles.card, { marginBottom: 15 }]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Re-enriquecer locales activos</Text>
            <Text style={styles.switchSubLabel}>Actualizar datos de locales ya enriquecidos</Text>
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
            <Text style={styles.statValue}>{estadisticas.totalOSM}</Text>
            <Text style={styles.statLabel}>Total OSM</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{estadisticas.enriquecidos}</Text>
            <Text style={styles.statLabel}>Enriquecidos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{estadisticas.rechazados}</Text>
            <Text style={styles.statLabel}>Rechazados</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{estadisticas.pendientes}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
        </View>
        <Text style={styles.progressLabel}>
          Progreso general: {estadisticas.totalOSM > 0 ? ((estadisticas.enriquecidos / estadisticas.totalOSM) * 100).toFixed(1) : 0}%
        </Text>
      </View>

      {estadisticas.totalOSM === 0 && (
        <View style={[styles.infoBox, { backgroundColor: '#FEF3C7', marginBottom: 15 }]}>
          <Text style={[styles.infoBoxTitle, { color: '#92400E' }]}>⚠️ Sin locales importados</Text>
          <Text style={[styles.infoBoxText, { color: '#92400E' }]}>
            No hay locales importados de OSM en {provinciaSeleccionada}.
          </Text>
          <Text style={[styles.infoBoxText, { color: '#92400E', marginTop: 5 }]}>
            Debes ir primero a &quot;Importación OSM&quot; para importar locales antes de poder enriquecerlos.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, { marginTop: 10 }]}
            onPress={() => router.push('/admin/importacion-osm')}
          >
            <Text style={styles.buttonText}>Ir a Importación OSM</Text>
          </TouchableOpacity>
          
          <View style={[styles.infoBox, { backgroundColor: '#DBEAFE', marginTop: 15 }]}>
            <Text style={[styles.infoBoxTitle, { color: '#1E40AF' }]}>💡 Información</Text>
            <Text style={[styles.infoBoxText, { color: '#1E40AF' }]}>
              El catálogo de importación OSM contiene los locales que has importado desde OpenStreetMap.
            </Text>
            <Text style={[styles.infoBoxText, { color: '#1E40AF', marginTop: 5 }]}>
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
            <Text style={styles.categoriaEmoji}>{cat.emoji}</Text>
            <Text style={styles.categoriaNombre}>{cat.categoria}</Text>
            <Text style={styles.categoriaStats}>Catalogados OSM</Text>
            <Text style={styles.categoriaTotal}>{cat.total}</Text>
            
            <View style={styles.categoriaDetails}>
              {cat.enriquecidos > 0 && (
                <Text style={styles.categoriaDetail}>✨ {cat.enriquecidos}</Text>
              )}
              {cat.pendientes > 0 && (
                <Text style={[styles.categoriaDetail, { color: '#F59E0B' }]}>⏳ {cat.pendientes}</Text>
              )}
              {cat.rechazados > 0 && (
                <Text style={[styles.categoriaDetail, { color: '#EF4444' }]}>❌ {cat.rechazados}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPaso3 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>3. Configurar Enriquecimiento</Text>
      <Text style={styles.subtitle}>{categoriaSeleccionada}</Text>

      <View style={styles.card}>
        <Text style={styles.infoText}>
          Quedan {localesPendientes} locales pendientes de enriquecer
        </Text>
        <Text style={[styles.infoText, { fontSize: 12, color: colors.textSecondary, marginTop: 5 }]}>
          {localesAEnriquecer.length} locales cargados en memoria
        </Text>

        <Text style={[styles.label, { marginTop: 20 }]}>Locales por lote</Text>
        <TextInput
          style={styles.input}
          value={localesPorLote.toString()}
          onChangeText={text => setLocalesPorLote(parseInt(text) || 0)}
          keyboardType="number-pad"
          placeholder="25"
        />

        <View style={[styles.infoBox, { marginTop: 15, backgroundColor: '#DBEAFE' }]}>
          <Text style={[styles.infoBoxTitle, { color: '#1E40AF' }]}>🔍 Sistema de Validación</Text>
          <Text style={[styles.infoBoxText, { color: '#1E40AF', marginTop: 5 }]}>
            Cada local será validado con el sistema de discriminación:{'\n\n'}
            ✅ PASO 1: Verificar tipos válidos (bar, restaurante, café, etc.){'\n'}
            ❌ PASO 2: Rechazar tipos prohibidos (farmacia, gimnasio, tienda, etc.){'\n'}
            ✅ PASO 3: Validar estado del negocio (operativo){'\n'}
            ✅ PASO 4: Verificar ubicación (España){'\n'}
            ✅ PASO 5: Validar datos mínimos (nombre, dirección, coordenadas){'\n'}
            📸 PASO 6: Descargar fotos y subirlas a Supabase Storage{'\n\n'}
            Los locales rechazados se marcarán en la base de datos con el motivo del rechazo.
          </Text>
        </View>

        <View style={[styles.infoBox, { marginTop: 10, backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.infoBoxTitle, { color: '#92400E' }]}>💰 Estimación de Coste</Text>
          <Text style={[styles.infoBoxText, { color: '#92400E' }]}>
            ${calcularCosteEstimado(Math.min(localesPorLote, localesPendientes, localesAEnriquecer.length))} en Google Places API
          </Text>
          <Text style={[styles.infoBoxText, { color: '#92400E', fontSize: 11, marginTop: 3 }]}>
            (2 llamadas por local: búsqueda + detalles + hasta 4 fotos)
          </Text>
        </View>

        <View style={[styles.infoBox, { marginTop: 10, backgroundColor: '#D1FAE5' }]}>
          <Text style={[styles.infoBoxTitle, { color: '#065F46' }]}>📸 Almacenamiento de Fotos</Text>
          <Text style={[styles.infoBoxText, { color: '#065F46' }]}>
            Las fotos se descargarán de Google Places y se subirán a Supabase Storage.{'\n\n'}
            ✅ Esto evita llamadas continuas a la API de Google{'\n'}
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
            <Text style={styles.buttonText}>
              Enriquecer {Math.min(localesPorLote, localesPendientes, localesAEnriquecer.length)} Locales
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Progreso */}
      {procesando && (
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>
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
          <Text style={styles.progressPercentage}>
            {((progreso.actual / progreso.total) * 100).toFixed(0)}%
          </Text>
        </View>
      )}

      {/* Logs en tiempo real */}
      {logs.length > 0 && (
        <View style={styles.logsCard}>
          <View style={styles.logsHeader}>
            <Text style={styles.logsTitle}>📡 Logs en Tiempo Real</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={copiarLogs}
            >
              <IconSymbol name="doc.on.doc" size={20} color={colors.primary} />
              <Text style={styles.copyButtonText}>Copiar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.logsContainer} nestedScrollEnabled>
            {logs.map((log, index) => (
              <View key={index} style={styles.logEntry}>
                <Text style={[styles.logTimestamp, { color: getLogColor(log.tipo) }]}>
                  [{log.timestamp}]
                </Text>
                <Text style={[styles.logMessage, { color: getLogColor(log.tipo) }]}>
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
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enriquecimiento con Google Places</Text>
        <Text style={styles.headerSubtitle}>
          📸 Las fotos se guardan en Supabase Storage
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
                <IconSymbol name="checkmark" size={16} color="white" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
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
              <Text style={styles.modalTitle}>Seleccionar Comunidad Autónoma</Text>
              <TouchableOpacity onPress={() => setMostrarSelectorComunidad(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
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
                      comunidadSeleccionada === comunidad && styles.modalItemTextSelected,
                    ]}
                  >
                    {comunidad}
                  </Text>
                  {comunidadSeleccionada === comunidad && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
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
              <Text style={styles.modalTitle}>Seleccionar Provincia</Text>
              <TouchableOpacity onPress={() => setMostrarSelectorProvincia(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
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
                      provinciaSeleccionada === provincia && styles.modalItemTextSelected,
                    ]}
                  >
                    {provincia}
                  </Text>
                  {provinciaSeleccionada === provincia && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  switchSubLabel: {
    fontSize: 13,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },
  progressLabel: {
    fontSize: 14,
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
    fontSize: 32,
    marginBottom: 8,
  },
  categoriaNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  categoriaStats: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  categoriaTotal: {
    fontSize: 20,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginHorizontal: 3,
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  infoBoxText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: 'white',
  },
  infoText: {
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 14,
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
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8,
  },
  logMessage: {
    fontSize: 11,
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
    fontSize: 18,
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
    fontSize: 16,
    color: colors.text,
  },
  modalItemTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});
